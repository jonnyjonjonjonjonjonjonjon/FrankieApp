import { useState, type ReactNode } from 'react'
import { KIND_SYMBOL } from '../../lib/symbols'
import type { Id, LibraryItem, LibraryKind, MealSlot } from '../../types'
import { Sheet } from '../ui/Sheet'
import { ClearButton, NoButton, YesButton } from '../ui/YesNo'
import { ChoiceGrid } from './ChoiceGrid'
import { NewItemForm } from './NewItemForm'
import { TryNew } from './TryNew'

interface Props {
  kind: LibraryKind
  title: string
  symbol?: string
  /** In the header before the title: what was chosen on the step before. */
  before?: ReactNode
  multi?: boolean
  initial?: Id[]
  /** Food picker for a meal: that meal's shelf first. */
  mealSlot?: MealSlot
  allowNone?: boolean
  /** A single-choice question that can also be answered "yes, without one" (Travel → Where to?). */
  onSkip?: () => void
  /** Show only these items (in this order) instead of the whole list. */
  subset?: LibraryItem[]
  /** Fields set on items added from this picker. */
  newItemExtra?: Partial<LibraryItem>
  onDone: (ids: Id[]) => void
  onBack: () => void
}

/** Scrollable grid of tiles answering one question (Where? Who? Food? Activity? Travel?). */
export function ItemPicker({ kind, title, symbol, before, multi = false, initial = [], mealSlot, allowNone, onSkip, subset, newItemExtra, onDone, onBack }: Props) {
  const [selected, setSelected] = useState<Id[]>(initial)
  // The shelf a new word starts on; undefined = not making one.
  const [adding, setAdding] = useState<string | null | undefined>(undefined)
  // Try something new: where it was opened from; null = not open.
  const [trying, setTrying] = useState<{ shelf: string | null; query: string } | null>(null)
  // Foods and activities from the whole list offer ideas she doesn't have yet (backlog item 16).
  const tryKind = !subset && (kind === 'food' || kind === 'activity') ? kind : null

  const pick = (id: Id) => {
    if (!multi) {
      onDone([id])
      return
    }
    setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]))
  }

  if (trying && tryKind) {
    return (
      <TryNew
        kind={tryKind}
        shelf={trying.shelf}
        query={trying.query}
        mealSlot={mealSlot}
        onBack={() => setTrying(null)}
        onAdded={item => {
          setTrying(null)
          if (multi) setSelected(s => [...s, item.id])
          else onDone([item.id])
        }}
      />
    )
  }

  if (adding !== undefined) {
    return (
      <NewItemForm
        kind={kind}
        mealSlot={mealSlot}
        category={adding}
        extra={newItemExtra}
        onBack={() => setAdding(undefined)}
        onCreated={item => {
          setAdding(undefined)
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
      before={before}
      onBack={onBack}
      hideBack
      footer={
        <>
          {allowNone && <ClearButton onClick={() => onDone([])} />}
          <NoButton onClick={onBack} />
          {multi && <YesButton onClick={() => onDone(selected)} />}
          {!multi && onSkip && <YesButton onClick={onSkip} />}
        </>
      }
    >
      <ChoiceGrid kind={kind} items={subset} selected={selected} onPick={pick} mealSlot={mealSlot} onNew={setAdding} onTry={tryKind ? setTrying : undefined} />
    </Sheet>
  )
}
