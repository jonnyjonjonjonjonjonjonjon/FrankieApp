import { getBlob } from './db'

const MAX_EDGE = 1280

/** Shrink a captured/uploaded image so the local store (and later cloud sync) stays small. */
export async function shrinkImage(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return file
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  if (scale === 1 && file.type === 'image/jpeg') {
    bitmap.close()
    return file
  }
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return file
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise<Blob>(resolve =>
    canvas.toBlob(b => resolve(b ?? file), 'image/jpeg', 0.85),
  )
}

// Object-URL cache so tiles don't re-read IndexedDB on every render.
const urlCache = new Map<string, string>()
const pending = new Map<string, Promise<string | null>>()

export function cachedUrl(id: string): string | undefined {
  return urlCache.get(id)
}

export function primeUrl(id: string, blob: Blob): string {
  const existing = urlCache.get(id)
  if (existing) URL.revokeObjectURL(existing)
  const url = URL.createObjectURL(blob)
  urlCache.set(id, url)
  return url
}

export function loadUrl(id: string): Promise<string | null> {
  const hit = urlCache.get(id)
  if (hit) return Promise.resolve(hit)
  const inflight = pending.get(id)
  if (inflight) return inflight
  const p = getBlob(id)
    .then(blob => (blob ? primeUrl(id, blob) : null))
    .finally(() => pending.delete(id))
  pending.set(id, p)
  return p
}

export function forgetUrl(id: string) {
  const url = urlCache.get(id)
  if (url) URL.revokeObjectURL(url)
  urlCache.delete(id)
}
