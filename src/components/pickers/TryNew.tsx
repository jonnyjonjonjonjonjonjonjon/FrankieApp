import { useEffect, useState } from 'react'
import { categoriesFor, categoryInfo } from '../../lib/categories'
import { findIdeas, freshIdeas, TRY_SYMBOL, type Idea, type IdeaKind } from '../../lib/ideas'
import { useStore } from '../../lib/store'
import { mulberryIndex, type MulberryEntry } from '../../lib/symbolImages'
import { track } from '../../lib/usage'
import type { LibraryItem, MealSlot } from '../../types'
import { BigButton } from '../ui/BigButton'
import { Sheet } from '../ui/Sheet'
import { Symbol } from '../ui/Symbol'
import { Tile } from '../ui/Tile'
import { NoButton, YesButton } from '../ui/YesNo'
import { Mosaic, ShelfTab } from './ChoiceGrid'
import { addIdea } from './newItemDraft'

const FIND_SYMBOL = '🔍'
/** The demo plays by itself the first few times Try is opened on a device, then waits for "Show me". */
const DEMO_AUTOPLAYS = 3
const DEMO_KEY = 'frankies-diary-try-demo'
const GRID = 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'

/** Opens so far on this device (0 if storage is unavailable, so she always sees the demo). */
function demoOpens(): number {
  try {
    return Number(localStorage.getItem(DEMO_KEY)) || 0
  } catch {
    return 0
  }
}
function countDemoOpen(n: number) {
  try {
    localStorage.setItem(DEMO_KEY, String(n))
  } catch {
    // storage unavailable
  }
}

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
 * yet, and a picture demo of how to search for one. Tapping an idea asks
 * "Add?"; the caller's Yes adds it (and picks it), No goes back. Content
 * only: the TryNew sheet wraps it for the full-screen pickers, the day's add
 * card shows it inline.
 */
export function TryNewPanel({ kind, shelf = null, query: initialQuery = '', chosen, onChoose }: Props) {
  const store = useStore()
  const [query, setQuery] = useState(initialQuery)
  const [tab, setTab] = useState<string>(shelf ?? 'all')
  // Counted once per open (the state holds the first answer; development's StrictMode counts twice).
  const [autoplay] = useState(() => {
    const n = demoOpens()
    countDemoOpen(n + 1)
    return n < DEMO_AUTOPLAYS
  })
  const [demoRun, setDemoRun] = useState(autoplay ? 1 : 0)
  useEffect(() => track('try_open'), [])

  const [mulberry, setMulberry] = useState<MulberryEntry[]>([])
  useEffect(() => {
    let live = true
    void mulberryIndex().then(list => live && setMulberry(list))
    return () => {
      live = false
    }
  }, [])

  // Removed words count as had: what the family took out isn't offered again.
  const items = Object.values(store.state.items)
  const fresh = freshIdeas(kind, items)
  const shelves = categoriesFor(kind).filter(c => fresh.some(i => i.category === c.id))
  const current = shelves.some(c => c.id === tab) ? tab : 'all'
  const newShelf = current !== 'all' ? current : (shelf ?? shelves[0]?.id ?? categoriesFor(kind)[0]?.id ?? '')
  const found = findIdeas(kind, items, query, mulberry, newShelf)
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
      {/* Demo, Find and Show me share one row on wide screens: the landscape tablet still shows a row of ideas. */}
      <div className="flex flex-col gap-3 lg:flex-row">
        {demoRun > 0 && <SearchDemo key={demoRun} />}
        <div className="flex min-w-0 flex-1 gap-3">
          <label className="flex min-h-20 min-w-0 flex-1 items-center gap-3 rounded-2xl lg:min-h-16 border-4 border-ink bg-paper px-3 focus-within:border-orange">
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
          <BigButton
            size="sm"
            className="shrink-0 flex-col py-1 lg:flex-row lg:py-0"
            onClick={() => {
              track('try_demo')
              setDemoRun(n => n + 1)
            }}
          >
            <Symbol symbol="mb:look-to" size="text-4xl" />
            <span className="text-xl font-extrabold">Show me</span>
          </BigButton>
        </div>
      </div>

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
          {!found.ideas.length && !found.more.length && <p className="px-3 text-2xl font-bold text-ink-soft">Nothing found</p>}
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
          {!fresh.length && <p className="px-3 text-2xl font-bold text-ink-soft">All added! Find another.</p>}
        </>
      )}
    </div>
  )
}

/**
 * How to search, in pictures (she is deaf, so nothing is said): 1. letters
 * appear in the Find box, 2. pictures pop up, 3. thumbs up. A ring and a
 * pointing hand move from panel to panel. Three rounds, then it rests on the
 * thumbs up (CSS keyframes only; still and numbered with reduced motion).
 */
function SearchDemo() {
  return (
    <div className="search-demo relative grid min-h-20 shrink-0 grid-cols-3 gap-3 lg:min-h-16 lg:w-[26rem]" role="img" aria-label="How to find: type the word, see the pictures, pick one">
      <DemoPanel n={1}>
        <span className="flex h-12 w-full items-center gap-1 rounded-xl border-4 border-ink bg-paper px-1.5">
          <Symbol symbol={FIND_SYMBOL} size="text-2xl" />
          <span className="text-2xl font-extrabold leading-none sm:text-3xl">
            {['c', 'a', 'k', 'e'].map((ch, i) => (
              <span key={i} className={`demo-l${i + 1}`}>
                {ch}
              </span>
            ))}
          </span>
        </span>
      </DemoPanel>
      <DemoPanel n={2}>
        <span className="flex gap-1">
          {['mb:cake', 'mb:cake_cup_cake', 'mb:doughnut'].map((s, i) => (
            <span key={s} className={`demo-t${i + 1} rounded-lg border-2 border-ink bg-paper p-0.5`}>
              <Symbol symbol={s} size="text-3xl" />
            </span>
          ))}
        </span>
      </DemoPanel>
      <DemoPanel n={3}>
        <span className="demo-yes">
          <Symbol symbol="mb:good" size="text-5xl" />
        </span>
      </DemoPanel>
      <span className="demo-ring pointer-events-none absolute inset-y-0 left-0 rounded-2xl border-4 border-orange" aria-hidden>
        <span className="absolute -right-2 -bottom-3">
          <Symbol symbol="mb:touch_screen" size="text-4xl" />
        </span>
      </span>
    </div>
  )
}

function DemoPanel({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="relative flex items-center justify-center overflow-hidden rounded-2xl border-4 border-line bg-soft px-2 pt-3">
      <span className="absolute top-1 left-2 text-lg font-extrabold text-ink-soft">{n}</span>
      {children}
    </div>
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
                try {
                  onAdded(await addIdea(store, chosen, mealSlot))
                } finally {
                  setBusy(false)
                }
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
