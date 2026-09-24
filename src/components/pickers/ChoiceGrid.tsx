import { useState } from 'react'
import { useStore } from '../../lib/store'
import { categoriesFor, categoryOf, defaultCategory, type Category } from '../../lib/categories'
import type { Id, LibraryItem, LibraryKind, MealSlot } from '../../types'
import { AddTile } from '../ui/AddTile'
import { BigButton } from '../ui/BigButton'
import { Symbol } from '../ui/Symbol'
import { Tile } from '../ui/Tile'

/** Lists longer than this get a Find box. */
const FIND_FROM = 12
/** Lists up to this long show "All" as one grid (shelf by shelf, no headings), so a short list fits one screen. */
const FLAT_UP_TO = 12

const GRID = 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'

interface Props {
  kind: LibraryKind
  /** Show only these items (in this order) instead of the whole kind. */
  items?: LibraryItem[]
  selected: Id[]
  onPick: (id: Id) => void
  /** Food for a meal: that meal's shelf comes first. */
  mealSlot?: MealSlot
  /** The New tile; called with the shelf the new word should go on. */
  onNew?: (category: string | null) => void
}

/**
 * The tiles answering one question, on shelves (backlog item 3). Tabs above
 * the grid jump to one shelf; "All" (always where it opens) shows every shelf
 * as its own section, so nothing is hidden behind a tab (a short list is one
 * grid in shelf order instead, so it still fits on one screen). Empty shelves are
 * left out, and a list with fewer than two shelves in use has no tabs at all.
 * Content only: ItemPicker wraps it in a Sheet, the day's add card uses it inline.
 */
export function ChoiceGrid({ kind, items: subset, selected, onPick, mealSlot, onNew }: Props) {
  const store = useStore()
  const [tab, setTab] = useState<string>('all')
  const [query, setQuery] = useState('')

  const all = subset ?? store.itemsOfKind(kind)
  const shelves = shelvesOf(kind, all, mealSlot)
  const tabbed = shelves.length >= 2
  // A shelf emptied while open (its last word moved away) falls back to All.
  const current = tabbed && shelves.some(s => s.category.id === tab) ? tab : 'all'

  const q = query.trim().toLowerCase()
  const found = q ? all.filter(i => i.name.toLowerCase().includes(q)) : null

  const tile = (item: LibraryItem) => (
    <Tile
      key={item.id}
      word={item.name}
      symbol={item.symbol}
      photoId={item.photoId}
      showPhoto={item.showPhoto}
      onFlip={() => store.toggleItemPhoto(item.id)}
      onSelect={() => onPick(item.id)}
      selected={selected.includes(item.id)}
    />
  )
  const newTile = onNew && (
    <AddTile
      word="New"
      onClick={() => onNew(current !== 'all' ? current : (shelves[0]?.category.id ?? defaultCategory(kind)))}
    />
  )

  return (
    <div className="flex flex-col gap-4">
      {all.length > FIND_FROM && (
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Find"
          autoComplete="off"
          className="min-h-16 w-full rounded-2xl border-4 border-line px-4 text-2xl font-bold outline-none focus:border-orange"
        />
      )}

      {tabbed && !found && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" data-noswipe role="tablist" aria-label="Shelves">
          <ShelfTab word="All" picture={<Mosaic symbols={shelves.slice(0, 4).map(s => s.category.symbol)} />} on={current === 'all'} onClick={() => setTab('all')} />
          {shelves.map(({ category }) => (
            <ShelfTab
              key={category.id}
              word={category.word}
              picture={<Symbol symbol={category.symbol} size="text-4xl" />}
              on={current === category.id}
              onClick={() => setTab(category.id)}
            />
          ))}
        </div>
      )}

      {found ? (
        <div className={GRID}>
          {found.map(tile)}
          {newTile}
        </div>
      ) : tabbed && current === 'all' && all.length <= FLAT_UP_TO ? (
        <div className={GRID}>
          {shelves.flatMap(s => s.items).map(tile)}
          {newTile}
        </div>
      ) : tabbed && current === 'all' ? (
        <>
          {shelves.map(({ category, items }) => (
            <section key={category.id} className="flex flex-col gap-3" aria-label={category.word}>
              <h3 className="flex items-center gap-3 rounded-2xl bg-soft px-3 py-1">
                <Symbol symbol={category.symbol} size="text-4xl" />
                <span className="text-2xl font-extrabold">{category.word}</span>
              </h3>
              <div className={GRID}>{items.map(tile)}</div>
            </section>
          ))}
          {newTile && <div className={GRID}>{newTile}</div>}
        </>
      ) : (
        <div className={GRID}>
          {(tabbed ? (shelves.find(s => s.category.id === current)?.items ?? []) : all).map(tile)}
          {newTile}
        </div>
      )}
    </div>
  )
}

interface Shelf {
  category: Category
  items: LibraryItem[]
}

/** The shelves in use, in their fixed order, except that a meal's own shelf comes first. */
function shelvesOf(kind: LibraryKind, items: LibraryItem[], mealSlot?: MealSlot): Shelf[] {
  const cats = categoriesFor(kind)
  if (!cats.length) return []
  const first = kind === 'food' && mealSlot ? cats.find(c => c.id === mealSlot) : undefined
  const ordered = first ? [first, ...cats.filter(c => c !== first)] : cats
  return ordered
    .map(category => ({ category, items: items.filter(i => categoryOf(i) === category.id) }))
    .filter(s => s.items.length > 0)
}

function ShelfTab({ word, picture, on, onClick }: { word: string; picture: React.ReactNode; on: boolean; onClick: () => void }) {
  return (
    // Picture above the word, like a small tile: narrow enough that a food list's seven tabs fit across the tablet.
    <BigButton size="sm" variant={on ? 'primary' : 'secondary'} role="tab" aria-selected={on} onClick={onClick} className="shrink-0 flex-col py-1">
      {picture}
      {/* Word styles on the span: the global button rule beats them on the button itself. */}
      <span className={`text-lg font-extrabold ${on ? 'text-white' : ''}`}>{word}</span>
    </BigButton>
  )
}

/** "All": a 2×2 of the first shelves' symbols (Mulberry's own "all" pictures are too abstract for her). */
function Mosaic({ symbols }: { symbols: string[] }) {
  return (
    <span className="grid h-[1.1em] w-[1.1em] shrink-0 grid-cols-2 place-items-center rounded-lg bg-paper text-4xl leading-none" aria-hidden>
      {symbols.map(s => (
        <Symbol key={s} symbol={s} size="text-[0.5em]" />
      ))}
    </span>
  )
}
