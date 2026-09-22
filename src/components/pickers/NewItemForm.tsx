import { useEffect, useMemo, useState } from 'react'
import { Check, X } from 'lucide-react'
import { useStore } from '../../lib/store'
import { searchSymbols, KIND_WORD } from '../../lib/symbols'
import type { LibraryItem, LibraryKind, MealSlot } from '../../types'
import { BigButton } from '../ui/BigButton'
import { Sheet } from '../ui/Sheet'
import { Symbol } from '../ui/Symbol'
import { PhotoInput } from './PhotoInput'

interface Props {
  kind: LibraryKind
  mealSlot?: MealSlot
  onCreated: (item: LibraryItem) => void
  onBack: () => void
}

/**
 * Add a new word (PRD §4.6): Word → Picture (symbol and/or photo) → Done, on one screen.
 * This is the only place Frankie types.
 */
export function NewItemForm({ kind, mealSlot, onCreated, onBack }: Props) {
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

  const symbols = searchSymbols(query || name)
  const canSave = name.trim().length > 0 && (symbol || photo) && !saving

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    const item = await store.addItem(kind, name, symbol, photo, mealSlot ? { meals: [mealSlot] } : {})
    setSaving(false)
    onCreated(item)
  }

  return (
    <Sheet
      title={`New — ${KIND_WORD[kind]}`}
      symbol="➕"
      onBack={onBack}
      footer={
        <BigButton variant="green" size="lg" disabled={!canSave} onClick={() => void save()}>
          <Check size={44} strokeWidth={3.5} />
          Done
        </BigButton>
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
                <BigButton size="sm" onClick={() => setPhoto(null)}>
                  <X size={28} strokeWidth={3} /> No photo
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
                aria-label={c.words[0]}
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
