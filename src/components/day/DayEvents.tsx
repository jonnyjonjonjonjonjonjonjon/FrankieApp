import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { buzz } from '../../lib/haptics'
import { useStore } from '../../lib/store'
import type { DiaryEvent, Id, ISODate } from '../../types'
import { lockGestures, unlockGestures } from '../ui/gestureLock'
import { EventRow } from './EventRow'
import type { Slot } from './RowEditor'

/**
 * The day is a timeline (owner, Sept 2026): a line down the left joins the rows, the row where today
 * has got to has an orange dot on it, and the + to add between two rows sits on the line.
 */
/** Where the line runs, from the list's left edge; rows start at GUTTER_REM, clear of it. */
const LINE_REM = 1.5
const GUTTER_REM = 3
/** Height of the + slot between rows (the flex gaps on either side add 1rem more). */
const SLOT_REM = 0.5
/** The + circle on the line; its tap area is the whole gap, the width of the gutter. */
const PLUS_REM = 1.75
/** Press and hold a row this long to lift it. */
const HOLD_MS = 450
/** Moving further than this (px) before the hold completes means it was a scroll or a swipe. */
const HOLD_SLOP = 10
/** The pressed row's border turns orange after this long (a colour change only: no transform on taps). */
const PRESS_MS = 120
/** After a slow tap opens something, the browser's own late click (ms) is kept off what just opened. */
const GHOST_MS = 500
/** While lifted, a finger this close (px) to the day's top or bottom edge scrolls it… */
const EDGE_PX = 64
/** …by up to this many px a frame, faster nearer the edge. */
const EDGE_SPEED = 14

interface Props {
  date: ISODate
  events: DiaryEvent[]
  /** The row the day has reached (today only). */
  currentId?: string | null
  onOpen: (id: string) => void
  /** The centre panel. Neighbour panels draw the same + slots (so nothing jumps when a slide lands) but inert. */
  interactive?: boolean
  /** A + tapped: a new row goes in at this index. */
  onCompose?: (index: number) => void
  /** A row just added: it arrives with a short rise. */
  freshId?: Id | null
  /** The open row (tapped): its empty slots show and `editor` slides open under it. */
  selectedId?: Id | null
  /** The part of the open row whose choices are showing. */
  panel?: Slot | null
  onSlot?: (id: Id, slot: Slot) => void
  onRemove?: (id: Id) => void
  editor?: ReactNode
}

interface Drag {
  id: string
  from: number
  /** Index among the other rows where it would land. */
  to: number
  dy: number
  /** Dragged row's wrapper (row + the + below it) + gap: how far others shift to make room. */
  gap: number
}

/**
 * The day's list, with a + between every pair of rows (and above the first,
 * below the last) that opens the add card right there. Press and hold a row
 * to drag it: it lifts and follows the finger while the rows
 * it passes slide out of the way, so the whole list stays readable. On release
 * the store applies the ordering rule.
 */
export function DayEvents({ date, events, currentId = null, onOpen, interactive = true, onCompose, freshId = null, selectedId = null, panel = null, onSlot, onRemove, editor }: Props) {
  const store = useStore()
  const root = useRef<HTMLDivElement>(null)
  /** Row wrappers (the row and the + slot below it). */
  const wrappers = useRef<Map<string, HTMLDivElement>>(new Map())
  const [drag, setDrag] = useState<Drag | null>(null)
  const [pressing, setPressing] = useState<Id | null>(null)
  /** A row is lifted: touchmoves on the list are cancelled so the day doesn't scroll under it. */
  const lifted = useRef(false)
  /** Swallow the click that can follow a drop. */
  const suppressClick = useRef(false)
  /** Cancels a pending hold. */
  const holding = useRef<(() => void) | null>(null)
  /** Ends a live drag in place (used on unmount). */
  const dropping = useRef<(() => void) | null>(null)

  // Chrome decides at touchstart whether a touch may be held back by script, from the areas that
  // have non-passive listeners. Registered from the start, the list stays one, so once a row lifts
  // its touchmoves can still be cancelled. Keep the handler trivial: scrolls starting here wait for it.
  useEffect(() => {
    const el = root.current
    if (!el || !interactive) return
    const block = (e: TouchEvent) => {
      if (lifted.current) e.preventDefault()
    }
    el.addEventListener('touchstart', block, { passive: false })
    el.addEventListener('touchmove', block, { passive: false })
    return () => {
      el.removeEventListener('touchstart', block)
      el.removeEventListener('touchmove', block)
    }
  }, [interactive])

  // Rows glide to their new places when a row's drawer opens (the rows below slide
  // down to make way) or closes (they slide back up), instead of jumping. Positions are list offsets, which transforms
  // don't change; each glide is a Web Animation with no fill, so nothing keeps a transform after it.
  const opened = `${selectedId}|${panel}`
  const placed = useRef<{ opened: string; tops: Map<string, number> }>({ opened, tops: new Map() })
  useLayoutEffect(() => {
    const list = root.current
    if (!list) return
    const tops = new Map<string, number>()
    wrappers.current.forEach((el, id) => tops.set(id, el.offsetTop - (el.offsetParent === list ? 0 : list.offsetTop)))
    const was = placed.current
    placed.current = { opened, tops }
    if (!interactive || was.opened === opened || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const css = getComputedStyle(document.documentElement)
    // The browser may hand back "0.8s" for "800ms".
    const raw = css.getPropertyValue('--move-slow').trim()
    const duration = (raw.endsWith('ms') ? parseFloat(raw) : parseFloat(raw) * 1000) || 800
    const easing = css.getPropertyValue('--move-ease').trim() || 'ease-in-out'
    tops.forEach((top, id) => {
      const before = was.tops.get(id)
      if (before === undefined || before === top) return
      wrappers.current.get(id)?.animate([{ transform: `translateY(${before - top}px)` }, { transform: 'translateY(0)' }], { duration, easing })
    })
  }, [opened, events, interactive])

  // An open row stays in sight: its choices bring the row to the top of the day (they are tall), its
  // strip scrolls just enough to show. Waits a frame for the drawer to be laid out.
  useEffect(() => {
    if (!selectedId) return
    const raf = requestAnimationFrame(() => {
      const wrapper = wrappers.current.get(selectedId)
      if (panel) wrapper?.firstElementChild?.scrollIntoView({ block: 'start', behavior: 'smooth' })
      else wrapper?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(raf)
  }, [selectedId, panel])

  // A row just added comes into view (the add card above it may have left the day scrolled past it).
  useEffect(() => {
    if (!freshId) return
    const raf = requestAnimationFrame(() => wrappers.current.get(freshId)?.firstElementChild?.scrollIntoView({ block: 'nearest' }))
    return () => cancelAnimationFrame(raf)
  }, [freshId])

  useEffect(
    () => () => {
      holding.current?.()
      dropping.current?.()
    },
    [],
  )

  /**
   * Lift a row and follow the pointer until it is released (or the browser takes the touch back).
   * `tapped`: the button a hold began on. A lift that never moves was a slow tap (she may press
   * slowly), so on release that button gets its click after all.
   */
  const beginDrag = (id: string, pointerId: number, y0: number, tapped: HTMLElement | null = null) => {
    const list = root.current
    const from = events.findIndex(x => x.id === id)
    if (!list || from < 0) return
    const scroller = list.closest<HTMLElement>('[data-day-scroller]')
    const scroll0 = scroller?.scrollTop ?? 0
    // Measured before the lift: the lifted row's transform must not stretch how far the day can scroll.
    const maxScroll = scroller ? scroller.scrollHeight - scroller.clientHeight : 0
    const rowGap = parseFloat(getComputedStyle(list).rowGap) || 0
    const gap = (wrappers.current.get(id)?.getBoundingClientRect().height ?? 0) + rowGap
    // Midpoints of the other rows (the row itself, not its + slot), measured once in content
    // coordinates: only transforms and the scroll position change during the drag.
    const mids = events
      .filter(x => x.id !== id)
      .map(x => {
        const r = wrappers.current.get(x.id)?.firstElementChild?.getBoundingClientRect()
        return r ? r.top + r.height / 2 + scroll0 : Infinity
      })
    const scrolled = () => (scroller?.scrollTop ?? 0) - scroll0
    let y = y0
    let still = true
    const target = () => mids.filter(m => m < y + scroll0 + scrolled()).length
    const update = () => setDrag(d => (d ? { ...d, dy: y - y0 + scrolled(), to: target() } : d))

    lifted.current = true
    suppressClick.current = true
    lockGestures()
    setDrag({ id, from, to: from, dy: 0, gap })

    // Near the top or bottom edge, scroll the day so a row can be taken anywhere in a long list.
    let frame = 0
    const edge = () => {
      frame = requestAnimationFrame(edge)
      // Not until the row has been moved: a still finger on a row near the edge is a slow tap.
      if (!scroller || still) return
      const r = scroller.getBoundingClientRect()
      let v = 0
      if (y < r.top + EDGE_PX) v = -EDGE_SPEED * Math.min(1, (r.top + EDGE_PX - y) / EDGE_PX)
      else if (y > r.bottom - EDGE_PX) v = EDGE_SPEED * Math.min(1, (y - r.bottom + EDGE_PX) / EDGE_PX)
      if (!v) return
      const next = Math.max(0, Math.min(maxScroll, scroller.scrollTop + v))
      if (next === scroller.scrollTop) return
      scroller.scrollTop = next
      update()
    }
    frame = requestAnimationFrame(edge)

    const move = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      y = ev.clientY
      if (Math.abs(y - y0) > HOLD_SLOP) still = false
      update()
    }
    const finish = (to: number, tap = false) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      cancelAnimationFrame(frame)
      lifted.current = false
      unlockGestures()
      dropping.current = null
      setDrag(null)
      if (to !== from) void store.moveEvent(date, id, to)
      else if (tap && tapped) {
        suppressClick.current = false
        tapped.click()
        // The browser may still send a click of its own where the finger was, which would land on the
        // sheet that just opened there: keep every click off the page for a moment.
        const ghost = (ev: MouseEvent) => {
          ev.preventDefault()
          ev.stopPropagation()
        }
        window.addEventListener('click', ghost, true)
        setTimeout(() => window.removeEventListener('click', ghost, true), GHOST_MS)
      }
    }
    // The browser taking the touch back (pointercancel) drops the row where it started.
    const end = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      if (ev.type === 'pointercancel') return finish(from)
      y = ev.clientY
      if (Math.abs(y - y0) > HOLD_SLOP) still = false
      if (still) finish(from, true)
      else finish(target())
    }
    dropping.current = () => finish(from)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }

  /** Press and hold anywhere on a row to lift it; a tap (even a slow one) still opens it. */
  const press = (id: string) => (e: PointerEvent<HTMLDivElement>) => {
    if (!interactive || drag || !e.isPrimary || e.button !== 0) return
    holding.current?.()
    const el = e.currentTarget
    const { pointerId, clientX: x0, clientY: y0 } = e
    const tapped = (e.target as HTMLElement).closest<HTMLElement>('button, [role="button"]')
    let y = y0
    const move = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      y = ev.clientY
      if (Math.hypot(ev.clientX - x0, ev.clientY - y0) > HOLD_SLOP) cancel() // a scroll or a swipe: let it be
    }
    const up = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId === pointerId) cancel() // a tap: its click opens the row as usual
    }
    const pressTimer = setTimeout(() => setPressing(id), PRESS_MS)
    const holdTimer = setTimeout(() => {
      cancel()
      buzz(30)
      try {
        el.setPointerCapture(pointerId)
      } catch {
        // the pointer has already gone
      }
      beginDrag(id, pointerId, y, tapped)
    }, HOLD_MS)
    const cancel = () => {
      clearTimeout(pressTimer)
      clearTimeout(holdTimer)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      holding.current = null
      setPressing(null)
    }
    holding.current = cancel
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  /** How far a non-dragged row (index k among the others) shifts. */
  const shiftFor = (k: number, d: Drag) => {
    if (k >= d.to && k < d.from) return d.gap // dragged row moving up past it: make room below
    if (k >= d.from && k < d.to) return -d.gap // dragged row moving down past it: make room above
    return 0
  }

  /** The + at a position in the list (on the timeline). */
  const slot = (index: number) => <AddSlot key="slot" hidden={Boolean(drag)} inert={!interactive} onClick={() => onCompose?.(index)} />

  let k = 0
  return (
    <div
      ref={root}
      className="relative flex flex-col gap-2"
      onPointerDownCapture={() => {
        suppressClick.current = false
      }}
      onClickCapture={e => {
        if (!suppressClick.current) return
        suppressClick.current = false
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      {/* The timeline: from the first + to the last, behind the dots. */}
      {events.length > 0 && (
        <div
          className="pointer-events-none absolute w-1.5 -translate-x-1/2 rounded-full bg-line"
          style={{ left: `${LINE_REM}rem`, top: `${SLOT_REM / 2}rem`, bottom: `${SLOT_REM / 2}rem` }}
          aria-hidden
        />
      )}
      {events.length === 0 ? (
        // An empty day: one big Add where the list would be (same in every panel).
          <button
            type="button"
            aria-label="Add here"
            inert={!interactive}
            onClick={() => onCompose?.(0)}
            className="flex min-h-24 items-center justify-center rounded-3xl border-4 border-orange-dark bg-orange active:scale-[0.98]"
          >
            <span className="flex items-center gap-3 text-3xl font-extrabold text-white">
              <Plus size={44} strokeWidth={4} />
              Add
            </span>
          </button>
      ) : (
        slot(0)
      )}
      {events.map((e, i) => {
        const isDragged = drag?.id === e.id
        let style: React.CSSProperties | undefined
        if (drag) {
          if (isDragged) {
            style = { transform: `translateY(${drag.dy}px)`, zIndex: 10, position: 'relative' }
          } else {
            style = { transform: `translateY(${shiftFor(k, drag)}px)`, transition: 'transform 160ms ease-out' }
            k++
          }
        }
        return (
          <div
            key={e.id}
            ref={el => {
              if (el) wrappers.current.set(e.id, el)
              else wrappers.current.delete(e.id)
            }}
            className="flex flex-col gap-2"
            style={style}
          >
            {/* The hold is on the row only, not on the + (or the add card) below it. */}
            <div
              className={`row-hold relative scroll-my-3 ${e.id === freshId ? 'open-in' : ''}`}
              style={{ paddingLeft: `${GUTTER_REM}rem` }}
              onPointerDown={press(e.id)}
              onContextMenu={ev => ev.preventDefault()}
            >
              {/* Only where today has got to has a dot on the timeline (orange), so it stands out. */}
              {e.id === currentId && (
                <span
                  className="pointer-events-none absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange ring-4 ring-paper"
                  style={{ left: `${LINE_REM}rem` }}
                  aria-hidden
                />
              )}
              <EventRow
                event={e}
                dragging={isDragged}
                pressing={pressing === e.id}
                current={e.id === currentId}
                onOpen={() => onOpen(e.id)}
                selected={e.id === selectedId}
                panel={e.id === selectedId ? panel : null}
                onSlot={slot => onSlot?.(e.id, slot)}
                onRemove={onRemove ? () => onRemove(e.id) : undefined}
              />
            </div>
            {/* The open row's drawer, lined up under its card (clear of the timeline). */}
            {e.id === selectedId && editor && <div style={{ paddingLeft: `${GUTTER_REM}rem` }}>{editor}</div>}
            {slot(i + 1)}
          </div>
        )
      })}
    </div>
  )
}

/** The + on the timeline between two rows: opens the add card at that spot. */
function AddSlot({ hidden, inert, onClick }: { hidden: boolean; inert: boolean; onClick: () => void }) {
  return (
    // Hidden by opacity only (while dragging or adding), so it keeps its space and nothing moves.
    <div
      className={`relative shrink-0 transition-opacity ${hidden ? 'opacity-0' : ''}`}
      style={{ height: `${SLOT_REM}rem` }}
      inert={inert}
      aria-hidden={inert || undefined}
    >
      {/* The tap area fills the gap between the rows across the gutter, so it is easy to hit. */}
      <button
        type="button"
        aria-label="Add here"
        onClick={onClick}
        className="group absolute top-1/2 left-0 flex h-[2rem] -translate-y-1/2 items-center justify-center"
        style={{ width: `${GUTTER_REM}rem` }}
      >
        {/* Colour and size on the span: the global button rule beats them on the button (.lucide is 1.35em on phones). */}
        <span
          className="flex items-center justify-center rounded-full border-[3px] border-orange bg-paper text-orange group-active:scale-90"
          style={{ width: `${PLUS_REM}rem`, height: `${PLUS_REM}rem` }}
        >
          <Plus size={18} strokeWidth={4} />
        </span>
      </button>
    </div>
  )
}
