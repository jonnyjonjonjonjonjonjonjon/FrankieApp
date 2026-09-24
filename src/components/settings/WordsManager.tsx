import { useState } from 'react'
import { ArrowDown, ArrowUp, ChevronRight, Plus, RotateCcw } from 'lucide-react'
import { categoriesFor, defaultCategory, type Category } from '../../lib/categories'
import { useStore } from '../../lib/store'
import { KIND_SYMBOL, KIND_WORD } from '../../lib/symbols'
import type { Id, LibraryItem, LibraryKind } from '../../types'
import { BigButton } from '../ui/BigButton'
import { Photo } from '../ui/Photo'
import { Symbol } from '../ui/Symbol'
import { NewItemForm } from '../pickers/NewItemForm'
import { WordEditor } from './WordEditor'

const KINDS: LibraryKind[] = ['person', 'place', 'food', 'activity', 'travel']

function Picture({ item }: { item: LibraryItem }) {
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-soft">
      {item.photoId && (item.showPhoto || !item.symbol) ? (
        <Photo id={item.photoId} alt={item.name} className="h-full w-full" />
      ) : (
        <Symbol symbol={item.symbol} size="text-5xl" />
      )}
    </div>
  )
}

/** One word: tap to change it; the arrows move it up or down its shelf. */
function WordRow({ item, onOpen, onUp, onDown }: { item: LibraryItem; onOpen: () => void; onUp?: () => void; onDown?: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border-4 border-line p-2">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-70">
        <Picture item={item} />
        <span className="min-w-0 flex-1 truncate text-2xl font-extrabold">{item.name}</span>
        <ChevronRight size={32} strokeWidth={3} className="shrink-0" />
      </button>
      <BigButton size="sm" className="max-sm:px-2" disabled={!onUp} onClick={onUp} aria-label={`Move ${item.name} up`}>
        <ArrowUp size={28} strokeWidth={3} />
      </BigButton>
      <BigButton size="sm" className="max-sm:px-2" disabled={!onDown} onClick={onDown} aria-label={`Move ${item.name} down`}>
        <ArrowDown size={28} strokeWidth={3} />
      </BigButton>
    </div>
  )
}

/**
 * Family settings → Words (backlog item 15): every person, place, food,
 * activity and travel word in one place, by shelf. Tap a word to rename it,
 * change its picture or shelf, or remove it; removed words can be restored.
 */
export function WordsManager() {
  const store = useStore()
  const [kind, setKind] = useState<LibraryKind>('person')
  const [editing, setEditing] = useState<Id | null>(null)
  // The shelf a new word starts on; undefined = not adding.
  const [adding, setAdding] = useState<string | null | undefined>(undefined)
  const [showRemoved, setShowRemoved] = useState(false)

  const shelves = categoriesFor(kind)
  const removed = store.deletedOfKind(kind)

  const list = (items: LibraryItem[]) => {
    const move = (i: number, by: -1 | 1) => {
      const ids = items.map(x => x.id)
      ;[ids[i], ids[i + by]] = [ids[i + by], ids[i]]
      void store.reorderItems(ids)
    }
    return items.map((item, i) => (
      <WordRow
        key={item.id}
        item={item}
        onOpen={() => setEditing(item.id)}
        onUp={i > 0 ? () => move(i, -1) : undefined}
        onDown={i < items.length - 1 ? () => move(i, 1) : undefined}
      />
    ))
  }

  const shelf = (c: Category) => {
    const items = store.itemsOfKind(kind, c.id)
    return (
      <div key={c.id} className="flex flex-col gap-2" role="group" aria-label={c.word}>
        <div className="flex items-center gap-3 rounded-2xl bg-soft px-3 py-1">
          <Symbol symbol={c.symbol} size="text-4xl" />
          <span className="flex-1 text-2xl font-extrabold">{c.word}</span>
          <BigButton size="sm" onClick={() => setAdding(c.id)} aria-label={`Add to ${c.word}`}>
            <Plus size={28} strokeWidth={3} />
            <span>Add</span>
          </BigButton>
        </div>
        {items.length ? list(items) : <p className="px-3 text-lg text-ink-soft">Nothing here yet.</p>}
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Kind">
        {KINDS.map(k => {
          const on = k === kind
          return (
            <BigButton
              key={k}
              variant={on ? 'primary' : 'secondary'}
              role="tab"
              aria-selected={on}
              onClick={() => {
                setKind(k)
                setShowRemoved(false)
              }}
            >
              <Symbol symbol={KIND_SYMBOL[k]} size="text-4xl" />
              <span className={on ? 'text-white' : ''}>{KIND_WORD[k]}</span>
            </BigButton>
          )
        })}
      </div>

      {shelves.length ? (
        shelves.map(shelf)
      ) : (
        <>
          {list(store.itemsOfKind(kind))}
          <BigButton variant="primary" className="self-start" onClick={() => setAdding(null)}>
            <Plus size={36} strokeWidth={3} />
            <span className="text-white">Add</span>
          </BigButton>
        </>
      )}

      {removed.length > 0 && (
        <div className="flex flex-col gap-2">
          <BigButton size="sm" className="self-start" aria-expanded={showRemoved} onClick={() => setShowRemoved(v => !v)}>
            <RotateCcw size={28} strokeWidth={2.5} />
            <span>Removed ({removed.length})</span>
          </BigButton>
          {showRemoved &&
            removed.map(item => (
              <div key={item.id} className="flex items-center gap-3 rounded-2xl border-4 border-dashed border-line p-2">
                <Picture item={item} />
                <span className="min-w-0 flex-1 truncate text-2xl font-extrabold text-ink-soft">{item.name}</span>
                <BigButton size="sm" onClick={() => void store.restoreItem(item.id)} aria-label={`Restore ${item.name}`}>
                  <RotateCcw size={28} strokeWidth={2.5} />
                  <span>Restore</span>
                </BigButton>
              </div>
            ))}
        </div>
      )}

      {editing && <WordEditor key={editing} itemId={editing} onClose={() => setEditing(null)} />}
      {adding !== undefined && (
        <NewItemForm
          kind={kind}
          category={adding ?? defaultCategory(kind)}
          onBack={() => setAdding(undefined)}
          onCreated={() => setAdding(undefined)}
        />
      )}
    </>
  )
}
