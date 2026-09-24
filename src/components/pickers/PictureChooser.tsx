import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Camera, Image, Search } from 'lucide-react'
import { creditOf, fetchImageBlob, searchImages, type WebImage } from '../../lib/imageSearch'
import { useStore } from '../../lib/store'
import { searchSymbols } from '../../lib/symbols'
import { mulberryIndex, preferMulberry, type MulberryEntry } from '../../lib/symbolImages'
import type { Id, PhotoCredit } from '../../types'
import { BigButton } from '../ui/BigButton'
import { Photo } from '../ui/Photo'
import { Symbol } from '../ui/Symbol'

const MAX_MULBERRY = 24
/** Symbols offered first in the grid (the best ones for the word). */
const SYMBOLS_SHOWN = 8
/** Web pictures offered in the grid. */
const WEB_SHOWN = 6
/** Wait this long after the last letter before searching the web (Openverse's anonymous limits are low). */
const DEBOUNCE_MS = 700
/** Search from this many letters. */
const MIN_LETTERS = 2
const CHANGE_SYMBOL = 'mb:change-to'

interface Props {
  /** The word being made or edited: the symbols and web pictures come from it. */
  word: string
  symbol: string
  onSymbol: (symbol: string) => void
  /** A new photo, not saved yet. */
  photo: Blob | null
  /** A photo from the camera or gallery (no credit), or from the web (with its credit). */
  onPhoto: (photo: Blob, credit: PhotoCredit | null) => void
  /** The word's saved photo, shown while no new one is chosen (the word editor). */
  keptPhotoId?: Id | null
  /** Take the photo away (the new one, or the saved one). */
  onClearPhoto: () => void
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
 * A word's picture, kept simple (owner, Sept 2026): the best symbol for the word is picked by
 * itself and shown big, with one Change button. Change opens a single grid of every choice (the
 * best symbols, pictures from the web, Camera, Photos, and Find for other symbols); tapping one
 * chooses it and closes the grid. Shared by the new-word form and the word editor. A symbol she
 * or the family chose is never replaced by the automatic pick.
 */
export function PictureChooser({ word, symbol, onSymbol, photo, onPhoto, keptPhotoId, onClearPhoto }: Props) {
  const store = useStore()
  const [changing, setChanging] = useState(false)
  const [query, setQuery] = useState('')
  const [finding, setFinding] = useState(false)
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo])
  useEffect(() => {
    if (!preview) return
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  const [mulberry, setMulberry] = useState<MulberryEntry[]>([])
  useEffect(() => {
    let live = true
    void mulberryIndex().then(list => live && setMulberry(list))
    return () => {
      live = false
    }
  }, [])
  const symbols = useMemo(() => pictureChoices(query || word, mulberry), [query, word, mulberry])

  // The best symbol for the word, picked by itself until someone picks something else.
  const autoPicked = useRef('')
  const best = useMemo(() => (word.trim() ? (pictureChoices(word, mulberry)[0]?.symbol ?? '') : ''), [word, mulberry])
  useEffect(() => {
    if (!best || (symbol && symbol !== autoPicked.current)) return
    autoPicked.current = best
    if (symbol !== best) onSymbol(best)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [best])

  // Web pictures for the word, once typing pauses (none offline or on any error).
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine)
  const term = word.trim()
  const [web, setWeb] = useState<{ term: string; images: WebImage[] } | null>(null)
  useEffect(() => {
    if (!online || term.length < MIN_LETTERS) return
    const ctrl = new AbortController()
    const t = setTimeout(() => {
      searchImages(term, 1, ctrl.signal).then(
        r => setWeb({ term, images: r.images.slice(0, WEB_SHOWN) }),
        () => {},
      )
    }, DEBOUNCE_MS)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [term, online])
  const webImages = online && web?.term === term ? web.images : []
  const [webChosen, setWebChosen] = useState<string | null>(null)
  const [getting, setGetting] = useState<string | null>(null)

  const cam = useRef<HTMLInputElement>(null)
  const gal = useRef<HTMLInputElement>(null)
  const done = () => {
    setChanging(false)
    setFinding(false)
    setQuery('')
  }
  const pickSymbol = (s: string) => {
    autoPicked.current = ''
    onSymbol(s)
    if (preview || keptPhotoId) onClearPhoto()
    setWebChosen(null)
    done()
  }
  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setWebChosen(null)
    onPhoto(f, null)
    done()
  }
  const pickWeb = async (img: WebImage) => {
    if (getting) return
    setGetting(img.id)
    try {
      onPhoto(await fetchImageBlob(img), creditOf(img))
      setWebChosen(img.id)
      done()
    } catch {
      store.toast("Couldn't get that picture")
    } finally {
      setGetting(null)
    }
  }

  const showingPhoto = Boolean(preview || keptPhotoId)
  const current = preview ? (
    <img src={preview} alt="" className="h-full w-full object-cover" />
  ) : keptPhotoId ? (
    <Photo id={keptPhotoId} className="h-full w-full" />
  ) : symbol ? (
    <Symbol symbol={symbol} size="text-8xl" />
  ) : null

  const inputs = (
    <>
      <input ref={cam} type="file" accept="image/*" capture="environment" className="hidden" onChange={pickFile} />
      <input ref={gal} type="file" accept="image/*" className="hidden" onChange={pickFile} />
    </>
  )

  if (!changing) {
    return (
      <div className="flex flex-wrap items-center gap-4">
        {inputs}
        <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-2xl border-4 border-orange bg-paper">
          {current ?? <span className="px-2 text-center text-xl font-bold text-ink-soft">Type the word</span>}
        </div>
        <BigButton size="lg" onClick={() => setChanging(true)}>
          <Symbol symbol={CHANGE_SYMBOL} size="text-5xl" />
          <span className="text-2xl font-extrabold">Change</span>
        </BigButton>
      </div>
    )
  }

  const TILE = 'relative flex aspect-square flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border-4 active:scale-95'
  const chosen = 'border-orange ring-4 ring-orange-light'
  return (
    <div className="fade-in flex flex-col gap-3">
      {inputs}
      {finding && (
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Find a symbol"
          aria-label="Find a symbol"
          autoComplete="off"
          autoFocus
          className="min-h-16 w-full rounded-2xl border-4 border-ink px-4 text-2xl font-bold outline-none focus:border-orange"
        />
      )}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {symbols.slice(0, finding ? MAX_MULBERRY : SYMBOLS_SHOWN).map((c, i) => (
          <button
            key={`${c.symbol}-${i}`}
            type="button"
            onClick={() => pickSymbol(c.symbol)}
            aria-label={c.word}
            aria-pressed={!showingPhoto && symbol === c.symbol}
            className={`${TILE} ${!showingPhoto && symbol === c.symbol ? `${chosen} bg-orange-light` : 'border-line bg-paper'}`}
          >
            <Symbol symbol={c.symbol} size="text-6xl" />
          </button>
        ))}
        {!finding &&
          webImages.map(img => (
            <button
              key={img.id}
              type="button"
              onClick={() => void pickWeb(img)}
              aria-label={img.title}
              aria-busy={getting === img.id}
              className={`${TILE} ${showingPhoto && webChosen === img.id ? chosen : 'border-line'} ${getting === img.id ? 'opacity-60' : ''}`}
            >
              <img src={img.thumb} alt="" referrerPolicy="no-referrer" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
            </button>
          ))}
        {/* A photo from the camera or gallery, already chosen: shown so it can be kept. */}
        {preview && !webChosen && (
          <button type="button" onClick={done} aria-label="Keep this photo" className={`${TILE} ${chosen}`}>
            <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
          </button>
        )}
        <button type="button" onClick={() => cam.current?.click()} className={`${TILE} border-line bg-soft`}>
          <Camera size={44} strokeWidth={2.5} />
          <span className="text-lg font-extrabold">Camera</span>
        </button>
        <button type="button" onClick={() => gal.current?.click()} className={`${TILE} border-line bg-soft`}>
          <Image size={44} strokeWidth={2.5} />
          <span className="text-lg font-extrabold">Photos</span>
        </button>
        {!finding && (
          <button type="button" onClick={() => setFinding(true)} className={`${TILE} border-line bg-soft`}>
            <Search size={44} strokeWidth={2.5} />
            <span className="text-lg font-extrabold">Find</span>
          </button>
        )}
      </div>
    </div>
  )
}

/** Mulberry pictures whose name matches first, then the emoji grid (drawn in Mulberry or OpenMoji). */
function pictureChoices(q: string, mulberry: MulberryEntry[]): { symbol: string; word: string }[] {
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const out: { symbol: string; word: string }[] = []
  const seen = new Set<string>()
  const add = (symbol: string, word: string) => {
    if (seen.has(symbol)) return
    seen.add(symbol)
    out.push({ symbol, word })
  }
  if (words.length) {
    const scored: [number, MulberryEntry][] = []
    for (const m of mulberry) {
      const label = m.label.toLowerCase()
      const parts = label.split(/[\s-]+/)
      let score = 0
      for (const w of words) {
        if (parts.includes(w) || parts.includes(`${w}s`) || parts.includes(w.replace(/s$/, ''))) score += 3
        else if (parts.some(p => p.startsWith(w))) score += 1
        else {
          score = 0
          break
        }
      }
      if (score) scored.push([score * 100 - label.length, m])
    }
    scored.sort((a, b) => b[0] - a[0])
    for (const [, m] of scored.slice(0, MAX_MULBERRY)) add(`mb:${m.id}`, m.label)
  }
  for (const c of searchSymbols(q)) add(preferMulberry(c.symbol), c.words[0])
  return out
}
