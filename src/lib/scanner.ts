import { normalizeBarcode } from './barcode'

/*
 * Continuous barcode scanning from a playing <video>. Uses the native BarcodeDetector where it supports
 * EAN/UPC (Chrome on Android), otherwise ZXing (e.g. iOS Safari), which is only downloaded when needed.
 * Every hit is checksum-validated, so misreads never trigger a lookup.
 */

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'] as const

interface DetectedBarcode {
  rawValue: string
  format: string
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>
}
interface BarcodeDetectorCtor {
  new (opts: { formats: string[] }): BarcodeDetectorLike
  getSupportedFormats(): Promise<string[]>
}

export interface Scanner {
  stop(): void
  engine: 'native' | 'zxing'
}

async function nativeDetector(): Promise<BarcodeDetectorLike | null> {
  const Ctor = (globalThis as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
  if (!Ctor) return null
  try {
    const supported = await Ctor.getSupportedFormats()
    const formats = FORMATS.filter((f) => supported.includes(f))
    if (!formats.includes('ean_13')) return null
    return new Ctor({ formats: [...formats] })
  } catch {
    return null
  }
}

export async function startScanner(video: HTMLVideoElement, onCode: (code: string) => void): Promise<Scanner> {
  let stopped = false
  let fired = false
  const hit = (raw: string, format?: string) => {
    if (stopped || fired) return
    const code = normalizeBarcode(raw, format)
    if (!code) return
    fired = true
    onCode(code)
  }

  const detector = await nativeDetector()
  if (detector) {
    let timer: ReturnType<typeof setTimeout> | undefined
    const tick = async () => {
      if (stopped || fired) return
      try {
        if (video.readyState >= 2) {
          for (const b of await detector.detect(video)) hit(b.rawValue, b.format)
        }
      } catch {
        // Frame not ready; try again next tick.
      }
      if (!stopped && !fired) timer = setTimeout(tick, 120)
    }
    void tick()
    return {
      engine: 'native',
      stop: () => {
        stopped = true
        clearTimeout(timer)
      },
    }
  }

  const [{ BrowserMultiFormatOneDReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
    import('@zxing/browser'),
    import('@zxing/library'),
  ])
  const hints = new Map<unknown, unknown>([
    [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]],
    [DecodeHintType.TRY_HARDER, true],
  ])
  const zxingFormat: Record<number, string> = {
    [BarcodeFormat.EAN_13]: 'ean_13',
    [BarcodeFormat.EAN_8]: 'ean_8',
    [BarcodeFormat.UPC_A]: 'upc_a',
    [BarcodeFormat.UPC_E]: 'upc_e',
  }
  const reader = new BrowserMultiFormatOneDReader(hints as Map<never, never>, { delayBetweenScanAttempts: 120 })
  const controls = await reader.decodeFromVideoElement(video, (result) => {
    if (result) hit(result.getText(), zxingFormat[result.getBarcodeFormat()])
  })
  if (stopped) controls.stop()
  return {
    engine: 'zxing',
    stop: () => {
      stopped = true
      controls.stop()
    },
  }
}
