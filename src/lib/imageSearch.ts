import type { PhotoCredit } from '../types'

/**
 * Pictures from the web for a new word (backlog item 2).
 *
 * The owner asked for Google image safe search. Google's only official image
 * search API (Custom Search JSON API) is closed to new customers, needs an API
 * key, a search-engine id and billing, and is being wound down; scraping
 * Google Images from a web app is blocked by CORS and by Google's terms. So
 * the search is a pluggable provider. Today there is one, Openverse: free, no
 * key, CORS-enabled, openly licensed pictures, and `mature=false` leaves out
 * results their source flagged as adult (weaker than Google SafeSearch, hence
 * the Family-mode default in WebPictures.tsx). A keyed source (Pixabay, Google…)
 * is one new provider and one line in PROVIDERS.
 *
 * Wikimedia Commons is not included: it has no safe-search filter.
 */

export interface WebImage {
  id: string
  /** A small picture to show in the grid (and to fetch when chosen). */
  thumb: string
  /** The full-size picture, tried if the thumbnail can't be fetched. */
  full?: string
  title: string
  creator?: string
  license?: string
  pageUrl?: string
  provider: string
}

export interface SearchPage {
  images: WebImage[]
  /** Another page can be asked for. */
  more: boolean
}

export interface ImageProvider {
  name: string
  search(q: string, page: number, signal: AbortSignal): Promise<SearchPage>
}

/** Results per page (Openverse allows up to 20 without a key). */
const PAGE_SIZE = 20

interface OpenverseResult {
  id: string
  title?: string | null
  thumbnail?: string | null
  url?: string | null
  creator?: string | null
  license?: string | null
  license_version?: string | null
  foreign_landing_url?: string | null
}

const openverse: ImageProvider = {
  name: 'Openverse',
  async search(q, page, signal) {
    const params = new URLSearchParams({ q, mature: 'false', page_size: String(PAGE_SIZE), page: String(page) })
    const res = await fetch(`https://api.openverse.org/v1/images/?${params}`, { signal, headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`Openverse ${res.status}`)
    const data = (await res.json()) as { results?: OpenverseResult[]; page_count?: number }
    const images = (data.results ?? [])
      .filter(r => r.id && (r.thumbnail || r.url))
      .map(r => ({
        id: `openverse:${r.id}`,
        thumb: (r.thumbnail || r.url) as string,
        full: r.url ?? undefined,
        title: r.title?.trim() || 'Picture',
        creator: r.creator ?? undefined,
        license: r.license ? `CC ${r.license.toUpperCase()}${r.license_version ? ` ${r.license_version}` : ''}` : undefined,
        pageUrl: r.foreign_landing_url ?? undefined,
        provider: 'Openverse',
      }))
    return { images, more: images.length > 0 && page < (data.page_count ?? page) }
  },
}

export const PROVIDERS: ImageProvider[] = [openverse]

/** Results kept for the session, so reopening a word (or typing it again) doesn't ask the network twice. */
const cache = new Map<string, Promise<SearchPage>>()

/**
 * One page of pictures for a word, from the first provider. Rejects on any
 * failure (the box then hides), or when this caller's signal aborts. The
 * search itself is shared and never cancelled by one caller: a second caller
 * for the same word (a re-run effect) gets the same answer, not an abort.
 */
export function searchImages(q: string, page: number, signal: AbortSignal): Promise<SearchPage> {
  const provider = PROVIDERS[0]
  const key = `${provider.name}|${q.trim().toLowerCase()}|${page}`
  let p = cache.get(key)
  if (!p) {
    p = provider.search(q.trim(), page, new AbortController().signal)
    cache.set(key, p)
    // A failed search is not remembered: the next try asks again.
    p.catch(() => cache.delete(key))
  }
  return untilAborted(p, signal)
}

/** The shared answer, or a rejection as soon as this caller gives up. */
function untilAborted<T>(p: Promise<T>, signal: AbortSignal): Promise<T> {
  const aborted = () => new DOMException('Aborted', 'AbortError')
  if (signal.aborted) return Promise.reject(aborted())
  return new Promise<T>((resolve, reject) => {
    const stop = () => reject(aborted())
    signal.addEventListener('abort', stop, { once: true })
    p.then(resolve, reject).finally(() => signal.removeEventListener('abort', stop))
  })
}

/** The chosen picture's bytes (the thumbnail, else the full picture), to be shrunk and stored like any photo. */
export async function fetchImageBlob(img: WebImage): Promise<Blob> {
  for (const url of [img.thumb, img.full]) {
    if (!url) continue
    try {
      const res = await fetch(url, { mode: 'cors' })
      if (!res.ok) continue
      const blob = await res.blob()
      if (blob.type.startsWith('image/') && blob.size > 0) return blob
    } catch {
      // try the next
    }
  }
  throw new Error("Couldn't get that picture")
}

export function creditOf(img: WebImage): PhotoCredit {
  return {
    title: img.title,
    ...(img.creator ? { creator: img.creator } : {}),
    ...(img.license ? { license: img.license } : {}),
    ...(img.pageUrl ? { url: img.pageUrl } : {}),
  }
}
