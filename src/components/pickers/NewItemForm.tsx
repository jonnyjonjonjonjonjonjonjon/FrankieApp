import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../lib/store'
import { searchSymbols, KIND_WORD } from '../../lib/symbols'
import { mulberryIndex, preferMulberry, type MulberryEntry } from '../../lib/symbolImages'
import type { LibraryItem, LibraryKind, MealSlot } from '../../types'
import { BigButton } from '../ui/BigButton'
import { Sheet } from '../ui/Sheet'
import { Symbol } from '../ui/Symbol'
import { NoButton, YesButton } from '../ui/YesNo'
import { PhotoInput } from './PhotoInput'

interface Props {
  kind: LibraryKind
  mealSlot?: MealSlot
  /** Extra fields to set on the new item (e.g. a stay place). */
  extra?: Partial<LibraryItem>
  onCreated: (item: LibraryItem) => void
  onBack: () => void
}

/**
 * Add a new word (PRD §4.6): Word → Picture (symbol and/or photo) → Yes, on one screen.
 * This is the only place Frankie types.
 */
export function NewItemForm({ kind, mealSlot, extra, onCreated, onBack }: Props) {
  const store = useStore()
  const [name, setName] = useState('')
  const [query, setQuery] = useState('')
  const [symbol, setSymbol] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

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

  const symbols = useMemo(() => pictureChoices(query || name, mulberry), [query, name, mulberry])
  const canSave = name.trim().length > 0 && (symbol || photo) && !saving

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    const item = await store.addItem(kind, name, symbol, photo, { ...(mealSlot ? { meals: [mealSlot] } : {}), ...extra })
    setSaving(false)
    onCreated(item)
  }

  return (
    <Sheet
      title={`New — ${KIND_WORD[kind]}`}
      symbol="➕"
      onBack={onBack}
      hideBack
      footer={
        <>
          <NoButton onClick={onBack} />
          <YesButton disabled={!canSave} onClick={() => void save()} />
        </>
      }
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        {/* 1. Word */}
        <section className="flex flex-col gap-2">
          <label className="text-2xl font-extrabold" htmlFor="new-word">
            1. Word
          </label>
          <input
            id="new-word"
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Type the word"
            autoComplete="off"
            className="min-h-24 w-full rounded-2xl border-4 border-ink px-4 text-4xl font-extrabold outline-none focus:border-orange"
          />
        </section>

        {/* 2. Picture */}
        <section className="flex flex-col gap-3">
          <h3 className="text-2xl font-extrabold">2. Picture</h3>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-2xl border-4 border-line bg-soft">
              {preview ? (
                <img src={preview} alt="" className="h-full w-full object-cover" />
              ) : symbol ? (
                <Symbol symbol={symbol} size="text-8xl" />
              ) : (
                <span className="text-xl font-bold text-ink-soft">Symbol or photo</span>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <PhotoInput onPick={setPhoto} />
              {photo && (
                // "Clear", not "No photo": only No itself starts with No (Q9).
                <BigButton size="sm" onClick={() => setPhoto(null)} aria-label="Clear photo">
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
                onClick={() => setSymbol(s => (s === c.symbol ? '' : c.symbol))}
                aria-label={c.word}
                className={`flex aspect-square items-center justify-center rounded-2xl border-4 ${
                  symbol === c.symbol ? 'border-orange bg-orange-light' : 'border-line bg-paper'
                } active:scale-95`}
              >
                <Symbol symbol={c.symbol} size="text-6xl" />
              </button>
            ))}
          </div>
        </section>
      </div>
    </Sheet>
  )
}

const MAX_MULBERRY = 24

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
