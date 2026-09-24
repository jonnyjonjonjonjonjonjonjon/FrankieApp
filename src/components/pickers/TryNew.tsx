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
import { addIdea } from './newItemDraft'

const FIND_SYMBOL = '🔍'
const MORE_SYMBOL = 'mb:more'
/** Ideas shown at a time: a short, calm grid (More shows the next ones). */
const IDEAS_AT_ONCE = 6
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
 * yet, kept simple (owner, Sept 2026): six ideas at a time (the shelf she came
 * from first), a More tile for the next six, and a Find tile that opens a
 * Find box. Tapping an idea asks
 * "Add?"; the caller's Yes adds it (and picks it), No goes back. Content
 * only: the TryNew sheet wraps it for the full-screen pickers, the day's add
 * card shows it inline.
 */
export function TryNewPanel({ kind, shelf = null, query: initialQuery = '', chosen, onChoose }: Props) {
  const store = useStore()
  const [query, setQuery] = useState(initialQuery)
  /** Which six ideas are showing (More steps on, and wraps round). */
  const [page, setPage] = useState(0)
  /** The Find box is open: tapped open, or she had already typed something before Try. */
  const [finding, setFinding] = useState(initialQuery.trim() !== '')
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
  // Her shelf's ideas first, then the rest in their usual order.
  const ordered = useMemo(() => (shelf ? [...fresh.filter(i => i.category === shelf), ...fresh.filter(i => i.category !== shelf)] : fresh), [fresh, shelf])
  const shown = ordered.length <= IDEAS_AT_ONCE ? ordered : [...ordered, ...ordered].slice((page * IDEAS_AT_ONCE) % ordered.length, ((page * IDEAS_AT_ONCE) % ordered.length) + IDEAS_AT_ONCE)
  const newShelf = shelf ?? categoriesFor(kind)[0]?.id ?? ''
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
      {finding && (
        <label className="flex min-h-20 min-w-0 items-center gap-3 rounded-2xl border-4 border-ink bg-paper px-3 focus-within:border-orange lg:min-h-16">
          <Symbol symbol={FIND_SYMBOL} size="text-5xl" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Find"
            aria-label="Find"
            autoComplete="off"
            autoFocus={!initialQuery}
            className="min-w-0 flex-1 bg-transparent text-4xl font-extrabold outline-none"
          />
        </label>
      )}

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
      ) : fresh.length ? (
        <div className={GRID}>
          {shown.map(tile)}
          {ordered.length > IDEAS_AT_ONCE && <Tile word="More" symbol={MORE_SYMBOL} onSelect={() => setPage(p => p + 1)} />}
          {!finding && <Tile word="Find" symbol={FIND_SYMBOL} onSelect={() => setFinding(true)} />}
        </div>
      ) : (
        <Empty symbol="mb:good" word="All added" />
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
