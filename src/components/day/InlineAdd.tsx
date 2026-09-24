import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, ChevronRight, Plus } from 'lucide-react'
import { useStore } from '../../lib/store'
import { defaultCategory } from '../../lib/categories'
import { eventTypeInfo, EVENT_TYPE_ORDER, WHERE_TO_SYMBOL } from '../../lib/symbols'
import type { EventType, Id, ISODate, LibraryItem, LibraryKind, MealSlot } from '../../types'
import { MEAL_TYPES } from '../../types'
import { BigButton } from '../ui/BigButton'
import { Symbol } from '../ui/Symbol'
import { Tile } from '../ui/Tile'
import { NoButton, YesButton } from '../ui/YesNo'
import { ChoiceGrid } from '../pickers/ChoiceGrid'
import { NewItemFields } from '../pickers/NewItemFields'
import { draftReady, newDraft, saveDraft, type NewItemDraft } from '../pickers/newItemDraft'

/** Space left above the card when it is scrolled to the top of the day (px). */
const TOP_MARGIN = 8

interface Props {
  date: ISODate
  /** Where in the day's list the new row goes. */
  index: number
  /** Closed: with the new row's id if something was added. */
  onClose: (addedId?: Id) => void
}

type Step =
  | { at: 'type' }
  /** Activity, a meal's foods, or how she is travelling. */
  | { at: 'pick'; type: EventType }
  | { at: 'where'; travelId: Id }
  /** Making a new word for the step it came from. */
  | { at: 'new'; kind: LibraryKind; from: Step & { at: 'pick' | 'where' } }

interface Crumb {
  step: Step
  word: string
  /** A symbol name, or a drawn mark (the + she tapped). */
  symbol: string | ReactNode
  /** What was chosen on the step before, shown ahead of this one ("Bus ➜"). */
  before?: ReactNode
}

/**
 * Adding to the day without leaving it (backlog item 7): a card in the list,
 * at the + she tapped. Pick a type → pick from the list → added there.
 * Travel is two picks: how she is going, then where to (or Yes for just "Bus").
 * The breadcrumb (her way back) sticks to the top of the day and No / Yes to
 * the bottom while the tiles scroll between them. No time is asked for; the
 * row's clock button adds one later if wanted.
 */
export function InlineAdd({ date, index, onClose }: Props) {
  const store = useStore()
  const [step, setStep] = useState<Step>({ at: 'type' })
  const [selected, setSelected] = useState<Id[]>([])
  const [draft, setDraft] = useState<NewItemDraft>(() => newDraft(null))
  const [busy, setBusy] = useState(false)
  const card = useRef<HTMLDivElement>(null)

  /** Bring the card's top to the top of the day's scroller. */
  const toTop = (behavior: ScrollBehavior, onlyIfAbove = false) => {
    const el = card.current
    const scroller = el?.closest<HTMLElement>('[data-day-scroller]')
    if (!el || !scroller) return
    // Offsets, not the bounding box: the arrival animation's transform must not skew it.
    let top = 0
    for (let n: HTMLElement | null = el; n && n !== scroller; n = n.offsetParent as HTMLElement | null) top += n.offsetTop
    top = Math.max(0, top - TOP_MARGIN)
    if (onlyIfAbove && top >= scroller.scrollTop) return
    scroller.scrollTo({ top, behavior })
  }
  // Opening: the card slides up to the top of the day, so the rows above make room for its tiles.
  useEffect(() => toTop('smooth'), [])
  // A new step can be much shorter than the last (a long food list → back to Add): keep the card in view.
  const stepKey = step.at === 'pick' ? `pick:${step.type}` : step.at
  useLayoutEffect(() => toTop('auto', true), [stepKey])

  const finish = async (type: EventType, ids: Id[]) => {
    if (busy) return
    setBusy(true)
    const meal = MEAL_TYPES.includes(type)
    const ev = await store.addEvent({
      date,
      index,
      type,
      activityId: type === 'activity' ? (ids[0] ?? null) : null,
      foodIds: meal ? ids : [],
    })
    const word = type === 'activity' && ids[0] ? store.state.items[ids[0]]?.name : eventTypeInfo(type).word
    store.toast(`${word} added`)
    onClose(ev.id)
  }

  const finishTravel = async (travelId: Id, placeId: Id | null) => {
    if (busy) return
    setBusy(true)
    const ev = await store.addEvent({ date, index, type: 'travel', travelId, placeId })
    store.toast(`${store.state.items[travelId]?.name ?? eventTypeInfo('travel').word} added`)
    onClose(ev.id)
  }

  const go = (next: Step) => {
    // Leaving a meal's list for the start: its ticks go with it.
    if (next.at === 'type') setSelected([])
    setStep(next)
  }

  const startNew = (from: Step & { at: 'pick' | 'where' }, kind: LibraryKind, category: string | null) => {
    setDraft(newDraft(category ?? defaultCategory(kind)))
    setStep({ at: 'new', kind, from })
  }

  const saveNew = async () => {
    if (step.at !== 'new' || !draftReady(draft) || busy) return
    const { kind, from } = step
    const mealSlot = from.at === 'pick' && MEAL_TYPES.includes(from.type) ? (from.type as MealSlot) : undefined
    setBusy(true)
    const item = await saveDraft(store, kind, draft, { mealSlot })
    setBusy(false)
    // As in the full-screen pickers: a single choice is made at once, a meal gets it ticked.
    if (from.at === 'where') void finishTravel(from.travelId, item.id)
    else if (from.type === 'travel') setStep({ at: 'where', travelId: item.id })
    else if (from.type === 'activity') void finish('activity', [item.id])
    else {
      setSelected(s => [...s, item.id])
      setStep(from)
    }
  }

  const crumbs = trail(step, store.state.items)

  let body: ReactNode
  let yes: ReactNode = null
  let no = () => onClose()
  if (step.at === 'type') {
    body = (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {EVENT_TYPE_ORDER.map(type => (
          <Tile
            key={type}
            word={eventTypeInfo(type).word}
            symbol={eventTypeInfo(type).symbol}
            onSelect={() => {
              // Types with nothing to choose are added straight away.
              if (type === 'activity' || type === 'travel' || MEAL_TYPES.includes(type)) go({ at: 'pick', type })
              else void finish(type, [])
            }}
          />
        ))}
      </div>
    )
  } else if (step.at === 'where') {
    const from = step
    body = (
      <ChoiceGrid
        kind="place"
        selected={[]}
        onPick={id => void finishTravel(from.travelId, id)}
        onNew={category => startNew(from, 'place', category)}
      />
    )
    yes = <YesButton disabled={busy} onClick={() => void finishTravel(from.travelId, null)} />
  } else if (step.at === 'pick') {
    const from = step
    const meal = MEAL_TYPES.includes(step.type)
    const kind: LibraryKind = step.type === 'travel' ? 'travel' : meal ? 'food' : 'activity'
    body = (
      <ChoiceGrid
        kind={kind}
        selected={selected}
        mealSlot={meal ? (step.type as MealSlot) : undefined}
        onPick={id => {
          if (from.type === 'travel') setStep({ at: 'where', travelId: id })
          else if (!meal) void finish('activity', [id])
          else setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]))
        }}
        onNew={category => startNew(from, kind, category)}
      />
    )
    if (meal) yes = <YesButton disabled={busy} onClick={() => void finish(from.type, selected)} />
  } else {
    body = <NewItemFields kind={step.kind} draft={draft} onChange={setDraft} />
    yes = <YesButton disabled={!draftReady(draft) || busy} onClick={() => void saveNew()} />
    // No on the new word goes back to the list it came from (as the full-screen form did).
    const from = step.from
    no = () => setStep(from)
  }

  return (
    <div
      ref={card}
      data-noswipe
      role="group"
      aria-label="Add"
      // overflow: clip rounds off the header and footer corners without making a scroll box (that would unstick them).
      className="open-in flex flex-col overflow-clip rounded-3xl border-4 border-orange bg-orange-light"
    >
      {/* Opaque, and sticky inside the day's scroller: the way back stays in sight while the tiles scroll.
          (-top-3 / -bottom-3: sticky insets count from inside the scroller's padding; these reach its edges.) */}
      <header className="sticky -top-3 z-10 flex flex-wrap items-center gap-x-2 gap-y-1 border-b-4 border-orange bg-orange-light px-3 py-2">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1
          return (
            <Fragment key={i}>
              {i > 0 && <ChevronRight size={32} strokeWidth={3} className="shrink-0 text-ink-soft" aria-hidden />}
              {last ? (
                <h3 className="flex min-w-0 items-center gap-2" aria-current="step">
                  {c.before}
                  {typeof c.symbol === 'string' ? <Symbol symbol={c.symbol} size="text-4xl" /> : c.symbol}
                  <span className="text-3xl font-extrabold">{c.word}</span>
                </h3>
              ) : (
                <BigButton size="sm" onClick={() => go(c.step)} aria-label={`Back to ${c.word}`}>
                  {typeof c.symbol === 'string' ? <Symbol symbol={c.symbol} size="text-3xl" /> : c.symbol}
                  <span className="text-xl font-extrabold">{c.word}</span>
                </BigButton>
              )}
            </Fragment>
          )
        })}
      </header>

      <div className="px-3 py-4">{body}</div>

      <footer className="sticky -bottom-3 z-10 flex flex-wrap justify-end gap-3 border-t-4 border-orange bg-orange-light px-3 py-2">
        <NoButton onClick={no} />
        {yes}
      </footer>
    </div>
  )
}

/** The breadcrumb for a step: every step before it (tap to go back), then where she is. */
function trail(step: Step, items: Record<Id, LibraryItem>): Crumb[] {
  const add: Crumb = { step: { at: 'type' }, word: 'Add', symbol: <PlusMark /> }
  if (step.at === 'type') return [add]
  if (step.at === 'pick') return [add, { step, ...eventTypeInfo(step.type) }]
  if (step.at === 'where') {
    const mode = items[step.travelId]
    return [
      ...trail({ at: 'pick', type: 'travel' }, items),
      {
        step,
        word: 'Where to?',
        symbol: WHERE_TO_SYMBOL,
        before: mode && (
          <span className="inline-flex shrink-0 items-center gap-2">
            <Symbol symbol={mode.symbol} size="text-4xl" />
            <span className="text-3xl font-extrabold">{mode.name}</span>
            <ArrowRight size={32} strokeWidth={3} aria-hidden />
          </span>
        ),
      },
    ]
  }
  return [...trail(step.from, items), { step, word: 'New', symbol: <PlusMark filled /> }]
}

/** The + she tapped to get here (white, like the + between rows), or the orange New tile's. */
function PlusMark({ filled = false }: { filled?: boolean }) {
  return (
    <span
      className={`flex h-[1em] w-[1em] shrink-0 items-center justify-center rounded-full border-4 border-orange-dark text-4xl ${
        filled ? 'bg-orange text-white' : 'bg-paper text-orange-dark'
      }`}
      aria-hidden
    >
      <Plus size={28} strokeWidth={4} />
    </span>
  )
}
