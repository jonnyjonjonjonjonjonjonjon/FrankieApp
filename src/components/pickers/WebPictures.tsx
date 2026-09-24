import { useEffect, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { creditOf, fetchImageBlob, searchImages, type WebImage } from '../../lib/imageSearch'
import { useStore } from '../../lib/store'
import type { PhotoCredit } from '../../types'
import { BigButton } from '../ui/BigButton'
import { Symbol } from '../ui/Symbol'
import { NoButton } from '../ui/YesNo'

/**
 * The web box shows only while Family mode is on: Openverse's adult filter
 * works on flags and is weaker than Google SafeSearch (backlog plan Q1).
 * Set false to let Frankie see it when she makes a word on her own.
 */
const WEB_PICTURES_FAMILY_ONLY = true
/** Wait this long after the last letter before searching (Openverse's anonymous limits are low). */
const DEBOUNCE_MS = 700
/** Search from this many letters. */
const MIN_LETTERS = 2
const WEB_SYMBOL = 'mb:globe'

interface Props {
  /** The word being typed: its pictures fill the box. */
  word: string
  /** A picture was chosen: its bytes (not shrunk yet) and where it came from. */
  onPick: (photo: Blob, credit: PhotoCredit) => void
  className?: string
}

interface Found {
  term: string
  images: WebImage[]
  /** Pages loaded so far. */
  page: number
  more: boolean
  failed: boolean
}

function subscribeOnline(fn: () => void) {
  window.addEventListener('online', fn)
  window.addEventListener('offline', fn)
  return () => {
    window.removeEventListener('online', fn)
    window.removeEventListener('offline', fn)
  }
}

/**
 * Pictures from the web for the word being typed (backlog item 2), beside
 * Camera and Photos: a box filled with the first four results. Tapping it
 * opens every result in a scrolling grid; tapping one makes it the word's
 * photo. Offline, on any error or with nothing typed, it isn't there at all,
 * so nothing is shown that could confuse her.
 */
export function WebPictures({ word, onPick, className = '' }: Props) {
  const store = useStore()
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine)
  const allowed = !WEB_PICTURES_FAMILY_ONLY || store.state.familyMode
  const wanted = word.trim()
  const [term, setTerm] = useState('')
  const [found, setFound] = useState<Found | null>(null)
  const [open, setOpen] = useState(false)

  // Search once typing pauses.
  useEffect(() => {
    if (!allowed) return
    const t = setTimeout(() => setTerm(wanted), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [wanted, allowed])

  useEffect(() => {
    if (!allowed || !online || term.length < MIN_LETTERS) return
    const ctrl = new AbortController()
    searchImages(term, 1, ctrl.signal).then(
      r => setFound({ term, images: r.images, page: 1, more: r.more, failed: false }),
      () => {
        if (!ctrl.signal.aborted) setFound({ term, images: [], page: 1, more: false, failed: true })
      },
    )
    return () => ctrl.abort()
  }, [term, online, allowed])

  const loadMore = async () => {
    if (!found?.more) return
    const next = found.page + 1
    try {
      const r = await searchImages(found.term, next, new AbortController().signal)
      setFound(f => (f && f.term === found.term ? { ...f, images: [...f.images, ...r.images], page: next, more: r.more } : f))
    } catch {
      setFound(f => (f && f.term === found.term ? { ...f, more: false } : f))
    }
  }

  if (!allowed || !online || wanted.length < MIN_LETTERS) return null
  const current = found && found.term === wanted ? found : null
  if (current?.failed) return null
  const loading = !current
  const none = current !== null && current.images.length === 0

  return (
    <>
      <button
        type="button"
        onClick={() => !loading && !none && setOpen(true)}
        aria-label={loading ? 'Web pictures: looking' : none ? 'Web pictures: none' : `Web pictures of ${wanted}`}
        aria-busy={loading}
        disabled={none}
        // The chosen picture's size (a 2×2 of the button's height would be too small to make out).
        className={`relative flex h-36 w-36 shrink-0 flex-col overflow-hidden rounded-2xl border-4 border-ink bg-soft active:scale-95 ${className}`}
      >
        {current && !none ? (
          <span className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-0.5">
            {current.images.slice(0, 4).map(img => (
              <img key={img.id} src={img.thumb} alt="" referrerPolicy="no-referrer" draggable={false} className="h-full w-full object-cover" />
            ))}
          </span>
        ) : (
          <span className={`flex min-h-0 flex-1 items-center justify-center ${loading ? 'web-pulse' : ''}`}>
            <Symbol symbol={WEB_SYMBOL} size="text-6xl" />
          </span>
        )}
        <span className="flex items-center justify-center gap-1 bg-ink py-0.5 text-white">
          <Symbol symbol={WEB_SYMBOL} size="text-2xl" />
          <span className="text-lg font-extrabold">{none ? 'None' : 'Web'}</span>
        </span>
      </button>
      {open && current && (
        <WebPanel
          word={current.term}
          images={current.images}
          more={current.more}
          onMore={loadMore}
          onClose={() => setOpen(false)}
          onPick={(blob, credit) => {
            setOpen(false)
            onPick(blob, credit)
          }}
        />
      )}
    </>
  )
}

interface PanelProps {
  word: string
  images: WebImage[]
  more: boolean
  onMore: () => Promise<void>
  onClose: () => void
  onPick: (photo: Blob, credit: PhotoCredit) => void
}

/**
 * The box opened out: every result in a scrolling grid, More at the end.
 * Above any full-screen sheet it was opened from, below the toast. On the
 * page's body, so no transformed or clipped box around it (the day's add card)
 * can shrink or cut it.
 */
function WebPanel({ word, images, more, onMore, onClose, onPick }: PanelProps) {
  const store = useStore()
  const [getting, setGetting] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  /** Pictures whose thumbnail didn't load: left out rather than shown broken. */
  const [broken, setBroken] = useState<Set<string>>(() => new Set())

  const choose = async (img: WebImage) => {
    if (getting) return
    setGetting(img.id)
    try {
      const blob = await fetchImageBlob(img)
      onPick(blob, creditOf(img))
    } catch {
      store.toast("Couldn't get that picture")
      setGetting(null)
    }
  }

  return createPortal(
    <div
      className="rise fixed inset-2 z-[45] flex flex-col overflow-hidden rounded-3xl border-4 border-ink bg-paper"
      role="dialog"
      aria-label={`Web pictures: ${word}`}
      data-noswipe
    >
      <header className="flex items-center gap-3 border-b-4 border-line px-3 py-2">
        <h2 className="flex min-w-0 flex-1 items-center gap-3 text-3xl font-extrabold">
          <Symbol symbol={WEB_SYMBOL} size="text-4xl" />
          <span className="truncate">{word}</span>
        </h2>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {images
            .filter(img => !broken.has(img.id))
            .map(img => {
              const on = getting === img.id
              return (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => void choose(img)}
                  aria-label={img.title}
                  aria-busy={on}
                  className={`aspect-square overflow-hidden rounded-2xl border-4 bg-soft active:scale-95 ${
                    on ? 'web-pulse border-orange ring-4 ring-orange' : 'border-ink'
                  }`}
                >
                  <img
                    src={img.thumb}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    draggable={false}
                    className="h-full w-full object-cover"
                    onError={() => setBroken(b => new Set(b).add(img.id))}
                  />
                </button>
              )
            })}
          {more && (
            <BigButton
              disabled={loadingMore}
              className="aspect-square flex-col"
              onClick={async () => {
                setLoadingMore(true)
                await onMore()
                setLoadingMore(false)
              }}
            >
              <Symbol symbol={WEB_SYMBOL} size="text-5xl" />
              <span className="text-2xl font-extrabold">More</span>
            </BigButton>
          )}
        </div>
        <p className="mt-3 text-lg text-ink-soft">Openly licensed pictures from Openverse. Pictures flagged as adult are left out.</p>
      </div>
      <footer className="safe-bottom flex justify-end gap-3 border-t-4 border-line px-3 py-3">
        <NoButton onClick={onClose} />
      </footer>
    </div>,
    document.body,
  )
}
