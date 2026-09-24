import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, Plus } from 'lucide-react'
import { useStore } from '../../lib/store'
import { defaultCategory } from '../../lib/categories'
import { eventTypeInfo, EVENT_TYPE_ORDER, WHERE_TO_SYMBOL } from '../../lib/symbols'
import type { EventType, Id, ISODate, LibraryItem, LibraryKind, MealSlot } from '../../types'
import { MEAL_TYPES } from '../../types'
import { Symbol } from '../ui/Symbol'
import { Tile } from '../ui/Tile'
import { NoButton, YesButton } from '../ui/YesNo'
import { useLeaveGhost } from '../ui/useLeaveGhost'
import { ChoiceGrid } from '../pickers/ChoiceGrid'
import { NewItemFields } from '../pickers/NewItemFields'
import { addIdea, draftReady, newDraft, saveDraft, type NewItemDraft } from '../pickers/newItemDraft'
import { TryNewPanel } from '../pickers/TryNew'
import { TRY_SYMBOL, type Idea, type IdeaKind } from '../../lib/ideas'
import { track, type UsageKey } from '../../lib/usage'

/** Space left above the card when it is scrolled to the top of the day (px). */
const TOP_MARGIN = 8
/**
 * Less room than this (rem) under the title bar and it stops sticking, so it
 * scrolls away with the card: the soft keyboard is up (it shrinks the page), or
 * the screen is tiny. Otherwise the box she is typing in hides behind it.
 */
const MIN_ROOM_REM = 14
/** Space kept around a text box scrolled into view while typing (px). */
const FIELD_MARGIN = 8

interface Props {
  date: ISODate
  /** Where in the day's list the new row goes. */
  index: number
  /** Closed: with the new row's id if something was added. */
  onClose: (addedId?: Id) => void
}

/** How deep each step is, so moving between them slides the right way. */
const STEP_DEPTH: Record<Step['at'], number> = { type: 0, pick: 1, where: 2, new: 3, try: 2 }

type Step =
  | { at: 'type' }
  /** Activity, a meal's foods, or how she is travelling. */
  | { at: 'pick'; type: EventType }
  | { at: 'where'; travelId: Id }
  /** Making a new word for the step it came from. */
  | { at: 'new'; kind: LibraryKind; from: Step & { at: 'pick' | 'where' } }
  /** Try something new: ideas for an activity or a meal she doesn't have yet. */
  | { at: 'try'; kind: IdeaKind; shelf: string | null; query: string; from: Step & { at: 'pick' } }

interface Heading {
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
 * Kept simple (owner, Sept 2026): one title bar says what she is choosing, with
 * No (and Yes, when there is one) beside it, sticking to the top of the day while
 * the tiles scroll under it. No goes back a step from Try and New, and closes the
 * card otherwise. No time is asked for; the row's clock button adds one later.
 */
export function InlineAdd({ date, index, onClose }: Props) {
  const store = useStore()
  const [step, setStep] = useState<Step>({ at: 'type' })
  const [selected, setSelected] = useState<Id[]>([])
  const [draft, setDraft] = useState<NewItemDraft>(() => newDraft(null))
  /** The Try idea tapped, waiting for Yes. */
  const [idea, setIdea] = useState<Idea | null>(null)
  const [busy, setBusy] = useState(false)
  const card = useRef<HTMLDivElement>(null)
  // Closing rolls it up into the + it came from (kept inside the day, clear of the bars).
  useLeaveGhost(card, 'roll-up', { clipTo: '[data-day-scroller]', zIndex: 20 })
  const header = useRef<HTMLElement>(null)
  /** Title bar not sticky: too little room under it (see MIN_ROOM_REM). */
  const [loose, setLoose] = useState(false)
  /** Bumped when the day's scroller or the title bar change size (the keyboard coming up). */
  const [resized, setResized] = useState(0)

  /** Bring the card's top to the top of the day's scroller. */
  /**
   * Keep her place in the day: the row just above the card sits at the top, so what comes before is
   * in sight and the card plainly opens between two rows (the rows below slide down to make room).
   * Adding at the very top shows the top of the day.
   */
  const toTop = (behavior: ScrollBehavior) => {
    const el = card.current
    const scroller = el?.closest<HTMLElement>('[data-day-scroller]')
    if (!el || !scroller) return
    const rows = [...scroller.querySelectorAll<HTMLElement>('.row-hold')]
    const above = rows.filter(r => r.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING).pop()
    if (!above) return scroller.scrollTo({ top: 0, behavior })
    // Offsets, not the bounding box: the rows' slide and the card's unroll must not skew it.
    let top = 0
    for (let n: HTMLElement | null = above; n && n !== scroller; n = n.offsetParent as HTMLElement | null) top += n.offsetTop
    scroller.scrollTo({ top: Math.max(0, top - TOP_MARGIN), behavior })
  }
  // Opening: glide the day so the row above the card is at the top.
  // A plain toast from the last add would sit on the title bar: it has done its job (an Undo stays).
  useEffect(() => {
    toTop('smooth')
    track('add_open')
    if (store.state.toast && !store.state.toast.undo) store.clearToast()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Each later step starts from the same place. A new step can be much shorter than the last (a long
  // food list → back to Add), and New's autofocus lets the browser scroll the box to wherever it likes.
  const stepKey = step.at === 'pick' ? `pick:${step.type}` : step.at === 'try' ? `try:${idea ? 'chosen' : ''}` : step.at
  const firstStep = useRef(stepKey)
  useLayoutEffect(() => {
    if (stepKey !== firstStep.current) toTop('auto')
    firstStep.current = ''
  }, [stepKey])
  // Which way the new step slides in: deeper steps from the right, going back from the left.
  const depth = STEP_DEPTH[step.at] + (step.at === 'try' && idea ? 1 : 0)
  const [shownStep, setShownStep] = useState({ key: stepKey, depth, slide: '' })
  if (shownStep.key !== stepKey) setShownStep({ key: stepKey, depth, slide: depth >= shownStep.depth ? 'from-right' : 'from-left' })

  // How much room the title bar leaves, whenever the day or the bar change size.
  useEffect(() => {
    const scroller = card.current?.closest<HTMLElement>('[data-day-scroller]')
    if (!scroller) return
    const measure = () => {
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      const room = scroller.clientHeight - (header.current?.offsetHeight ?? 0)
      setLoose(room < MIN_ROOM_REM * rem)
      setResized(n => n + 1)
    }
    const watch = new ResizeObserver(measure)
    for (const el of [scroller, header.current]) if (el) watch.observe(el)
    return () => watch.disconnect()
  }, [])

  /** Scroll the day just enough that a text box (with its label, if that fits too) shows under the title bar. */
  const reveal = (field: HTMLElement) => {
    const scroller = card.current?.closest<HTMLElement>('[data-day-scroller]')
    if (!scroller) return
    const s = scroller.getBoundingClientRect()
    // A sticky title bar can cover the top of the day (once scrolled, it will); a loose one scrolls away.
    const top = s.top + (loose ? 0 : (header.current?.offsetHeight ?? 0)) + FIELD_MARGIN
    const bottom = s.bottom - FIELD_MARGIN
    const section = field.closest('section')
    const box = (section && section.getBoundingClientRect().height <= bottom - top ? section : field).getBoundingClientRect()
    const d = box.top < top || box.height > bottom - top ? box.top - top : box.bottom > bottom ? box.bottom - bottom : 0
    if (d) scroller.scrollTop += d
  }
  // After a resize (the keyboard arriving, or the bar coming unstuck), the box being typed in stays in sight.
  useLayoutEffect(() => {
    const field = document.activeElement
    if (isTextField(field) && card.current?.contains(field)) reveal(field)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loose, resized])

  const finish = async (type: EventType, ids: Id[]) => {
    if (busy) return
    setBusy(true)
    const meal = MEAL_TYPES.includes(type)
    try {
      const ev = await store.addEvent({
        date,
        index,
        type,
        activityId: type === 'activity' ? (ids[0] ?? null) : null,
        foodIds: meal ? ids : [],
      })
      const word = type === 'activity' && ids[0] ? store.state.items[ids[0]]?.name : eventTypeInfo(type).word
      track(addedKey(type))
      store.toast(`${word} added`)
      onClose(ev.id)
    } finally {
      // A failed write leaves the card usable (after a success it has already gone).
      setBusy(false)
    }
  }

  const finishTravel = async (travelId: Id, placeId: Id | null) => {
    if (busy) return
    setBusy(true)
    try {
      const ev = await store.addEvent({ date, index, type: 'travel', travelId, placeId })
      track('add_travel')
      store.toast(`${store.state.items[travelId]?.name ?? eventTypeInfo('travel').word} added`)
      onClose(ev.id)
    } finally {
      setBusy(false)
    }
  }

  const go = (next: Step) => {
    // Leaving a meal's list for the start: its ticks go with it.
    if (next.at === 'type') setSelected([])
    setIdea(null)
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
    let item: LibraryItem
    try {
      item = await saveDraft(store, kind, draft, { mealSlot })
    } catch {
      store.toast("Couldn't add that")
      return
    } finally {
      setBusy(false)
    }
    // As in the full-screen pickers: a single choice is made at once, a meal gets it ticked.
    if (from.at === 'where') void finishTravel(from.travelId, item.id)
    else if (from.type === 'travel') setStep({ at: 'where', travelId: item.id })
    else if (from.type === 'activity') void finish('activity', [item.id])
    else {
      setSelected(s => [...s, item.id])
      setStep(from)
    }
  }

  const startTry = (from: Step & { at: 'pick' }, kind: IdeaKind, at: { shelf: string | null; query: string }) => {
    setIdea(null)
    setStep({ at: 'try', kind, from, ...at })
  }

  /** Yes on a Try idea: it becomes a word, then is picked like any tile (an activity is added, a food ticked). */
  const addTried = async () => {
    if (step.at !== 'try' || !idea || busy) return
    const { from } = step
    const mealSlot = MEAL_TYPES.includes(from.type) ? (from.type as MealSlot) : undefined
    setBusy(true)
    let item: LibraryItem
    try {
      item = await addIdea(store, idea, mealSlot)
    } catch {
      store.toast("Couldn't add that")
      return
    } finally {
      setBusy(false)
    }
    setIdea(null)
    if (from.type === 'activity') void finish('activity', [item.id])
    else {
      setSelected(s => [...s, item.id])
      setStep(from)
    }
  }

  const here = heading(step, store.state.items)

  let body: ReactNode
  let yes: ReactNode = null
  let no = () => {
    track('add_cancel')
    onClose()
  }
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
        findButton
      />
    )
    yes = <YesButton compact disabled={busy} onClick={() => void finishTravel(from.travelId, null)} />
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
        onTry={kind === 'travel' ? undefined : at => startTry(from, kind, at)}
        findButton
      />
    )
    if (meal) yes = <YesButton compact disabled={busy} onClick={() => void finish(from.type, selected)} />
  } else if (step.at === 'try') {
    body = <TryNewPanel kind={step.kind} shelf={step.shelf} query={step.query} chosen={idea} onChoose={setIdea} />
    if (idea) yes = <YesButton compact disabled={busy} onClick={() => void addTried()} />
    // No steps back: from "Add?" to the ideas, from the ideas to the list she came from.
    const from = step.from
    no = () => (idea ? setIdea(null) : setStep(from))
  } else {
    body = <NewItemFields kind={step.kind} draft={draft} onChange={setDraft} />
    yes = <YesButton compact disabled={!draftReady(draft) || busy} onClick={() => void saveNew()} />
    // No on the new word goes back to the list it came from (as the full-screen form did).
    const from = step.from
    no = () => setStep(from)
  }
  const answers = (
    <>
      <NoButton compact onClick={no} />
      {yes}
    </>
  )
  const stick = loose ? 'relative' : 'sticky'

  return (
    <div
      ref={card}
      data-noswipe
      role="group"
      aria-label="Add"
      // overflow: clip rounds off the header and footer corners without making a scroll box (that would unstick them).
      className="unroll flex flex-col overflow-clip rounded-3xl border-4 border-orange bg-orange-light"
      onFocus={e => {
        if (isTextField(e.target)) reveal(e.target)
      }}
    >
      {/* Opaque, and sticky inside the day's scroller: what she is choosing, and the way out, stay in sight
          while the tiles scroll. (-top-3: sticky insets count from inside the scroller's padding; this reaches its edge.) */}
      {/* The answers drop under the title when both won't fit on one line (a phone's "Bus ➜ Where to?"). */}
      <header ref={header} className={`${stick} -top-3 z-10 flex flex-wrap items-center gap-3 border-b-4 border-orange bg-orange-light px-3 py-2`}>
        <h3 className="flex min-w-0 flex-[1_1_14rem] flex-wrap items-center gap-2" aria-current="step">
          {here.before}
          {typeof here.symbol === 'string' ? <Symbol symbol={here.symbol} size="text-4xl" /> : here.symbol}
          <span className="text-3xl font-extrabold">{here.word}</span>
        </h3>
        <div className="ml-auto flex shrink-0 gap-3">{answers}</div>
      </header>

      <div key={stepKey} className={`px-3 py-4 ${shownStep.key === stepKey ? shownStep.slide : ''}`}>
        {body}
      </div>

    </div>
  )
}

function isTextField(el: EventTarget | null): el is HTMLInputElement | HTMLTextAreaElement {
  return el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && !['button', 'checkbox', 'radio', 'file'].includes(el.type))
}

/** The title for a step: what she is choosing now (after "Bus ➜" on Where to?). */
function heading(step: Step, items: Record<Id, LibraryItem>): Heading {
  if (step.at === 'type') return { word: 'Add', symbol: <PlusMark /> }
  if (step.at === 'pick') return eventTypeInfo(step.type)
  if (step.at === 'where') {
    const mode = items[step.travelId]
    return {
      word: 'Where to?',
      symbol: WHERE_TO_SYMBOL,
      before: mode && (
        <span className="inline-flex shrink-0 items-center gap-2">
          <Symbol symbol={mode.symbol} size="text-4xl" />
          <span className="text-3xl font-extrabold">{mode.name}</span>
          <ArrowRight size={32} strokeWidth={3} aria-hidden />
        </span>
      ),
    }
  }
  if (step.at === 'try') return { word: 'Try', symbol: TRY_SYMBOL }
  return { word: 'New', symbol: <PlusMark filled /> }
}

/** The usage count for adding a row of this type. */
function addedKey(type: EventType): UsageKey {
  if (type === 'activity') return 'add_activity'
  if (type === 'travel') return 'add_travel'
  return MEAL_TYPES.includes(type) ? 'add_meal' : 'add_routine'
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
