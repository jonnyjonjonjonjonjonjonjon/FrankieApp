import { useMemo, useState } from 'react'
import { useStore } from '../../lib/store'
import { KIND_SYMBOL } from '../../lib/symbols'
import type { Id, LibraryItem, LibraryKind, MealSlot } from '../../types'
import { AddTile } from '../ui/AddTile'
import { Sheet } from '../ui/Sheet'
import { Tile } from '../ui/Tile'
import { ClearButton, NoButton, YesButton } from '../ui/YesNo'
import { NewItemForm } from './NewItemForm'

interface Props {
  kind: LibraryKind
  title: string
  symbol?: string
  multi?: boolean
  initial?: Id[]
  /** Food picker for a meal: preferred items first, others below. */
  mealSlot?: MealSlot
  allowNone?: boolean
  /** Show only these items (in this order) instead of the whole list. */
  subset?: LibraryItem[]
  /** Fields set on items added from this picker. */
  newItemExtra?: Partial<LibraryItem>
  onDone: (ids: Id[]) => void
  onBack: () => void
}

/** Scrollable grid of tiles answering one question (Where? Who? Food? Activity?). */
export function ItemPicker({ kind, title, symbol, multi = false, initial = [], mealSlot, allowNone, subset, newItemExtra, onDone, onBack }: Props) {
  const store = useStore()
  const [selected, setSelected] = useState<Id[]>(initial)
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)

  const all = subset ?? store.itemsOfKind(kind)
  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = q ? all.filter(i => i.name.toLowerCase().includes(q)) : all
    if (kind === 'food' && mealSlot) {
      const fits = (i: LibraryItem) => (i.meals ?? []).includes(mealSlot)
      list = [...list.filter(fits), ...list.filter(i => !fits(i))]
    }
    return list
  }, [all, query, kind, mealSlot])

  const toggle = (id: Id) => {
    if (!multi) {
      onDone([id])
      return
    }
    setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]))
  }

  if (adding) {
    return (
      <NewItemForm
        kind={kind}
        mealSlot={mealSlot}
        extra={newItemExtra}
        onBack={() => setAdding(false)}
        onCreated={item => {
          setAdding(false)
          if (multi) setSelected(s => [...s, item.id])
          else onDone([item.id])
        }}
      />
    )
  }

  return (
    <Sheet
      title={title}
      symbol={symbol ?? KIND_SYMBOL[kind]}
      onBack={onBack}
      hideBack
      footer={
        <>
          {allowNone && <ClearButton onClick={() => onDone([])} />}
          <NoButton onClick={onBack} />
          {multi && <YesButton onClick={() => onDone(selected)} />}
        </>
      }
    >
      {all.length > 12 && (
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Find"
          autoComplete="off"
          className="mb-4 min-h-16 w-full rounded-2xl border-4 border-line px-4 text-2xl font-bold outline-none focus:border-orange"
        />
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map(item => (
          <Tile
            key={item.id}
            word={item.name}
            symbol={item.symbol}
            photoId={item.photoId}
            showPhoto={item.showPhoto}
            onFlip={() => store.toggleItemPhoto(item.id)}
            onSelect={() => toggle(item.id)}
            selected={selected.includes(item.id)}
          />
        ))}
        <AddTile word="New" onClick={() => setAdding(true)} />
      </div>
    </Sheet>
  )
}
