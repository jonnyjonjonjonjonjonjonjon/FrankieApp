import { useEffect, useMemo, useState } from 'react'
import { searchSymbols } from '../../lib/symbols'
import { mulberryIndex, preferMulberry, type MulberryEntry } from '../../lib/symbolImages'
import type { Id } from '../../types'
import { BigButton } from '../ui/BigButton'
import { Photo } from '../ui/Photo'
import { Symbol } from '../ui/Symbol'
import { PhotoInput } from './PhotoInput'

const MAX_MULBERRY = 24

interface Props {
  /** The word being made or edited: the symbol search starts from it. */
  word: string
  symbol: string
  onSymbol: (symbol: string) => void
  /** A new photo, not saved yet. */
  photo: Blob | null
  onPhoto: (photo: Blob) => void
  /** The word's saved photo, shown while no new one is chosen (the word editor). */
  keptPhotoId?: Id | null
  /** Take the photo away (the new one, or the saved one). */
  onClearPhoto: () => void
}

/**
 * A word's picture: the chosen picture, Camera and Photos, then a searchable
 * symbol grid. Shared by the new-word form and the word editor, so both get
 * the same picture choices (and, later, the web pictures box beside Photos).
 */
export function PictureChooser({ word, symbol, onSymbol, photo, onPhoto, keptPhotoId, onClearPhoto }: Props) {
  const [query, setQuery] = useState('')
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
  const hasPhoto = Boolean(preview || keptPhotoId)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-2xl border-4 border-line bg-soft">
          {preview ? (
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : keptPhotoId ? (
            <Photo id={keptPhotoId} className="h-full w-full" />
          ) : symbol ? (
            <Symbol symbol={symbol} size="text-8xl" />
          ) : (
            <span className="text-xl font-bold text-ink-soft">Symbol or photo</span>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <PhotoInput onPick={onPhoto} />
          {hasPhoto && (
            // "Clear", not "No photo": only No itself starts with No (Q9).
            <BigButton size="sm" onClick={onClearPhoto} aria-label="Clear photo">
              <Symbol symbol="mb:remove-to" size="text-3xl" />
              <span className="text-lg">Clear</span>
            </BigButton>
          )}
        </div>
      </div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Find a symbol"
        autoComplete="off"
        className="min-h-16 w-full rounded-2xl border-4 border-line px-4 text-2xl font-bold outline-none focus:border-orange"
      />
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
        {symbols.map((c, i) => (
          <button
            key={`${c.symbol}-${i}`}
            type="button"
            onClick={() => onSymbol(symbol === c.symbol ? '' : c.symbol)}
            aria-label={c.word}
            aria-pressed={symbol === c.symbol}
            className={`flex aspect-square items-center justify-center rounded-2xl border-4 ${
              symbol === c.symbol ? 'border-orange bg-orange-light' : 'border-line bg-paper'
            } active:scale-95`}
          >
            <Symbol symbol={c.symbol} size="text-6xl" />
          </button>
        ))}
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
