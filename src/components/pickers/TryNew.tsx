import { useEffect, useMemo, useState } from 'react'
import { categoriesFor, categoryInfo } from '../../lib/categories'
import { findIdeas, freshIdeas, TRY_SYMBOL, type Idea, type IdeaKind } from '../../lib/ideas'
import { useStore } from '../../lib/store'
import { mulberryIndex, type MulberryEntry } from '../../lib/symbolImages'
import { track } from '../../lib/usage'
import type { LibraryItem, MealSlot } from '../../types'
import { Sheet } from '../ui/Sheet'
import { Symbol } from '../ui/Symbol'
import { Tile } from '../ui/Tile'
import { NoButton, YesButton } from '../ui/YesNo'
import { Mosaic, ShelfTab } from './ChoiceGrid'
import { addIdea } from './newItemDraft'

const FIND_SYMBOL = '🔍'
const GRID = 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'

interface Props {
  kind: IdeaKind
  /** The shelf it opens on (the one she was looking at), or all of them. */
  shelf?: string | null
  /** What she had typed in Find before tapping Try. */
  query?: string
  /** The idea tapped, waiting for Yes (the owner's Yes / No answer it). */
  chosen: Idea | null
  onChoose: (idea: Idea | null) => void
}

/**
 * Try something new (backlog item 16): foods or activities she doesn't have
 * yet, with a Find box for more. Tapping an idea asks
 * "Add?"; the caller's Yes adds it (and picks it), No goes back. Content
 * only: the TryNew sheet wraps it for the full-screen pickers, the day's add
 * card shows it inline.
 */
export function TryNewPanel({ kind, shelf = null, query: initialQuery = '', chosen, onChoose }: Props) {
  const store = useStore()
  const [query, setQuery] = useState(initialQuery)
  /** The shelf tab tapped (null: none yet). */
  const [tab, setTab] = useState<string | null>(shelf ?? null)
  useEffect(() => {
    track('try_open')
  }, [])

  const [mulberry, setMulberry] = useState<MulberryEntry[]>([])
  useEffect(() => {
    let live = true
    void mulberryIndex().then(list => live && setMulberry(list))
    return () => {
      live = false
    }
  }, [])

  // Removed words count as had: what the family took out isn't offered again.
  const all = store.state.items
  const items = useMemo(() => Object.values(all), [all])
  const fresh = useMemo(() => freshIdeas(kind, items), [kind, items])
  const shelves = useMemo(() => categoriesFor(kind).filter(c => fresh.some(i => i.category === c.id)), [kind, fresh])
  // Opens on a shelf rather than All: All's first heading would push the landscape tablet's row of ideas below the fold.
  const wanted = tab ?? shelves[0]?.id ?? 'all'
  const current = wanted === 'all' || shelves.some(c => c.id === wanted) ? wanted : (shelves[0]?.id ?? 'all')
  const newShelf = current !== 'all' ? current : (shelf ?? shelves[0]?.id ?? categoriesFor(kind)[0]?.id ?? '')
  // Scores the whole Mulberry index: only when the letters (or her words) change.
  const found = useMemo(() => findIdeas(kind, items, query, mulberry, newShelf), [kind, items, query, mulberry, newShelf])
  const q = query.trim()

  if (chosen) {
    return (
      // Side by side on wide screens, so the landscape tablet shows it all under the card's bar.
      <div className="flex flex-col items-center justify-center gap-4 py-4 text-center lg:flex-row lg:gap-10" aria-live="polite">
        <div className="flex h-56 w-56 shrink-0 items-center justify-center rounded-3xl border-4 border-ink bg-soft">
          <Symbol symbol={chosen.symbol} size="text-[10rem]" />
        </div>
        <div className="flex flex-col items-center gap-4">
          <span className="text-5xl font-extrabold">{chosen.name}</span>
          <span className="text-4xl font-extrabold text-ink-soft">Add?</span>
        </div>
      </div>
    )
  }

  const tile = (idea: Idea) => <Tile key={idea.symbol + idea.name} word={idea.name} symbol={idea.symbol} onSelect={() => onChoose(idea)} />

  return (
    <div className="flex flex-col gap-2.5">
      <label className="flex min-h-20 min-w-0 items-center gap-3 rounded-2xl border-4 border-ink bg-paper px-3 focus-within:border-orange lg:min-h-16">
        <Symbol symbol={FIND_SYMBOL} size="text-5xl" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Find"
          aria-label="Find"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-4xl font-extrabold outline-none"
        />
      </label>

      {q ? (
        <>
          {found.ideas.length > 0 && <div className={GRID}>{found.ideas.map(tile)}</div>}
          {found.more.length > 0 && (
            <section className="flex flex-col gap-3" aria-label="More pictures">
              <h3 className="flex items-center gap-3 rounded-2xl bg-soft px-3 py-1">
                <Symbol symbol={FIND_SYMBOL} size="text-4xl" />
                <span className="text-2xl font-extrabold">More pictures</span>
              </h3>
              <div className={GRID}>{found.more.map(tile)}</div>
            </section>
          )}
          {!found.ideas.length && !found.more.length && <Empty symbol={FIND_SYMBOL} word="None" />}
        </>
      ) : (
        <>
          {shelves.length >= 2 && (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Shelves" data-noswipe>
              <ShelfTab word="All" picture={<Mosaic symbols={shelves.slice(0, 4).map(s => s.symbol)} />} on={current === 'all'} onClick={() => setTab('all')} />
              {shelves.map(c => (
                <ShelfTab key={c.id} word={c.word} picture={<Symbol symbol={c.symbol} size="text-4xl" />} on={current === c.id} onClick={() => setTab(c.id)} />
              ))}
            </div>
          )}
          {current === 'all' ? (
            shelves.map(c => (
              <section key={c.id} className="flex flex-col gap-3" aria-label={c.word}>
                <h3 className="flex items-center gap-3 rounded-2xl bg-soft px-3 py-1">
                  <Symbol symbol={c.symbol} size="text-4xl" />
                  <span className="text-2xl font-extrabold">{c.word}</span>
                </h3>
                <div className={GRID}>{fresh.filter(i => i.category === c.id).map(tile)}</div>
              </section>
            ))
          ) : (
            <div className={GRID}>{fresh.filter(i => i.category === current).map(tile)}</div>
          )}
          {!fresh.length && <Empty symbol="mb:good" word="All added" />}
        </>
      )}
    </div>
  )
}

/** Nothing to show: a picture and a word, like everywhere else. */
function Empty({ symbol, word }: { symbol: string; word: string }) {
  return (
    <p className="flex items-center gap-3 px-3 py-2" aria-live="polite">
      <Symbol symbol={symbol} size="text-6xl" />
      <span className="text-3xl font-extrabold text-ink-soft">{word}</span>
    </p>
  )
}

interface SheetProps {
  kind: IdeaKind
  shelf?: string | null
  query?: string
  mealSlot?: MealSlot
  /** The idea was added as a new word. */
  onAdded: (item: LibraryItem) => void
  onBack: () => void
}

/** Try as a full-screen sheet, for the pickers opened from a row (the day's add card shows TryNewPanel inline). */
export function TryNew({ kind, shelf, query, mealSlot, onAdded, onBack }: SheetProps) {
  const store = useStore()
  const [chosen, setChosen] = useState<Idea | null>(null)
  const [busy, setBusy] = useState(false)
  const shelfWord = categoryInfo(kind, shelf ?? null)?.word
  return (
    <Sheet
      title={shelfWord ? `Try — ${shelfWord}` : 'Try'}
      symbol={TRY_SYMBOL}
      onBack={onBack}
      hideBack
      footer={
        <>
          <NoButton onClick={() => (chosen ? setChosen(null) : onBack())} />
          {chosen && (
            <YesButton
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                let item: LibraryItem
                try {
                  item = await addIdea(store, chosen, mealSlot)
                } catch {
                  store.toast("Couldn't add that")
                  return
                } finally {
                  setBusy(false)
                }
                onAdded(item)
              }}
            />
          )}
        </>
      }
    >
      <TryNewPanel kind={kind} shelf={shelf} query={query} chosen={chosen} onChoose={setChosen} />
    </Sheet>
  )
}
