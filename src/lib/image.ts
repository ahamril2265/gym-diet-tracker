/** Max width/height sent to Gemini. */
export const MAX_IMAGE_DIM = 1024

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode image'))), 'image/jpeg', quality),
  )
}

function drawScaled(source: CanvasImageSource, w: number, h: number, maxDim: number): HTMLCanvasElement {
  const scale = Math.min(1, maxDim / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(w * scale))
  canvas.height = Math.max(1, Math.round(h * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas
}

/** Resizes a picked photo to ≤ maxDim px and re-encodes it as JPEG (EXIF rotation applied). */
export async function compressImage(file: Blob, maxDim = MAX_IMAGE_DIM, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    return await canvasToJpeg(drawScaled(bitmap, bitmap.width, bitmap.height, maxDim), quality)
  } finally {
    bitmap.close()
  }
}

/** Grabs the current camera frame as a ≤ maxDim JPEG. */
export async function captureVideoFrame(video: HTMLVideoElement, maxDim = MAX_IMAGE_DIM, quality = 0.85): Promise<Blob> {
  if (!video.videoWidth) throw new Error('Camera not ready')
  return canvasToJpeg(drawScaled(video, video.videoWidth, video.videoHeight, maxDim), quality)
}
