import { useRef, useState, type PointerEvent } from 'react'
import { useStore } from '../../lib/store'
import type { DiaryEvent, ISODate } from '../../types'
import { EventRow } from './EventRow'

interface Props {
  date: ISODate
  events: DiaryEvent[]
  /** The row the day has reached (today only). */
  currentId?: string | null
  onOpen: (id: string) => void
  onTime: (id: string) => void
}

interface Drag {
  id: string
  from: number
  /** Index among the other rows where it would land. */
  to: number
  dy: number
  /** Dragged row height + gap: how far others shift to make room. */
  gap: number
}

const ROW_GAP = 12 // matches gap-3

/**
 * The day's list. Drag a row by its grip: it lifts and follows the finger while
 * the rows it passes slide out of the way, so the whole list stays readable.
 * On release the store applies the ordering rule.
 */
export function DayEvents({ date, events, currentId = null, onOpen, onTime }: Props) {
  const store = useStore()
  const rows = useRef<Map<string, HTMLDivElement>>(new Map())
  const [drag, setDrag] = useState<Drag | null>(null)

  const start = (id: string) => (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const from = events.findIndex(x => x.id === id)
    const startY = e.clientY
    const me = rows.current.get(id)
    const gap = (me?.getBoundingClientRect().height ?? 0) + ROW_GAP
    // Midpoints of the other rows, measured once: only transforms change during the drag.
    const mids = events
      .filter(x => x.id !== id)
      .map(x => {
        const r = rows.current.get(x.id)?.getBoundingClientRect()
        return r ? r.top + r.height / 2 : Infinity
      })
    const target = (y: number) => mids.filter(m => m < y).length
    setDrag({ id, from, to: from, dy: 0, gap })

    const move = (ev: globalThis.PointerEvent) => {
      setDrag(d => (d ? { ...d, dy: ev.clientY - startY, to: target(ev.clientY) } : d))
    }
    // While dragging, the page must not scroll under the finger.
    const block = (ev: Event) => ev.preventDefault()
    window.addEventListener('touchmove', block, { passive: false })
    const end = (ev: globalThis.PointerEvent) => {
      window.removeEventListener('touchmove', block)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      const to = ev.type === 'pointercancel' ? from : target(ev.clientY)
      setDrag(null)
      if (to !== from) void store.moveEvent(date, id, to)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }

  /** How far a non-dragged row (index k among the others) shifts. */
  const shiftFor = (k: number, d: Drag) => {
    if (k >= d.to && k < d.from) return d.gap // dragged row moving up past it: make room below
    if (k >= d.from && k < d.to) return -d.gap // dragged row moving down past it: make room above
    return 0
  }

  let k = 0
  return (
    <div className="flex flex-col gap-3">
      {events.map(e => {
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
              if (el) rows.current.set(e.id, el)
              else rows.current.delete(e.id)
            }}
            style={style}
          >
            <EventRow event={e} dragging={isDragged} current={e.id === currentId} onOpen={() => onOpen(e.id)} onTime={() => onTime(e.id)} onGrip={start(e.id)} />
          </div>
        )
      })}
    </div>
  )
}
