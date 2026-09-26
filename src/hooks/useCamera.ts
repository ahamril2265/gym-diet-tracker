import { useCallback, useEffect, useRef, useState } from 'react'

export type CameraError = 'denied' | 'no-camera' | 'in-use' | 'insecure' | 'unsupported' | 'unknown'

export const CAMERA_ERROR_TEXT: Record<CameraError, string> = {
  denied: 'Camera permission was denied. Allow camera access for this site in your browser settings, or pick a photo instead.',
  'no-camera': 'No camera was found on this device. You can pick a photo instead.',
  'in-use': 'The camera is being used by another app. Close it and try again.',
  insecure: 'The camera needs a secure (https) connection. Open the app over https.',
  unsupported: 'This browser can’t use the camera. You can pick a photo instead.',
  unknown: 'The camera couldn’t start. Try again, or pick a photo instead.',
}

function classify(e: unknown): CameraError {
  const name = (e as { name?: string })?.name
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied'
  if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'DevicesNotFoundError') return 'no-camera'
  if (name === 'NotReadableError' || name === 'TrackStartError') return 'in-use'
  return 'unknown'
}

type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean }

/**
 * Rear camera stream attached to a <video>. Stops when `active` is false or the page is hidden (saves
 * battery, frees the camera for other apps) and restarts when visible again.
 */
export function useCamera(active: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [status, setStatus] = useState<'idle' | 'starting' | 'ready' | 'error'>('idle')
  const [error, setError] = useState<CameraError | null>(null)
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || document.visibilityState === 'visible')

  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  useEffect(() => {
    if (!active || !visible) return
    let cancelled = false
    const start = async () => {
      if (!window.isSecureContext) {
        setStatus('error')
        setError('insecure')
        return
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('error')
        setError('unsupported')
        return
      }
      setStatus('starting')
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await video.play().catch(() => {})
        }
        const track = stream.getVideoTracks()[0]
        const caps = (track?.getCapabilities?.() ?? {}) as TorchCapabilities
        setTorchSupported(Boolean(caps.torch))
        setTorchOn(false)
        setError(null)
        setStatus('ready')
      } catch (e) {
        if (cancelled) return
        setStatus('error')
        setError(classify(e))
      }
    }
    void start()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
      setTorchOn(false)
      setStatus('idle')
    }
  }, [active, visible])

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    const next = !torchOn
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] })
      setTorchOn(next)
    } catch {
      setTorchSupported(false)
    }
  }, [torchOn])

  return { videoRef, status, error, torchSupported, torchOn, toggleTorch }
}
