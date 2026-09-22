import { useRef, useState, type PointerEvent } from 'react'
import { useStore } from '../../lib/store'
import type { DiaryEvent, ISODate } from '../../types'
import { EventRow } from './EventRow'

interface Props {
  date: ISODate
  events: DiaryEvent[]
  onOpen: (id: string) => void
  onTime: (id: string) => void
}

/**
 * The day's list. Rows are dragged by their grip: the row lifts and follows the
 * finger, an orange bar shows where it will land, and the store applies the
 * ordering rule on release.
 */
export function DayEvents({ date, events, onOpen, onTime }: Props) {
  const store = useStore()
  const rows = useRef<Map<string, HTMLDivElement>>(new Map())
  const [drag, setDrag] = useState<{ id: string; startY: number; dy: number; to: number } | null>(null)

  const targetIndex = (pointerY: number, draggedId: string) => {
    const others = events.filter(e => e.id !== draggedId)
    let idx = 0
    for (const e of others) {
      const el = rows.current.get(e.id)
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (pointerY > r.top + r.height / 2) idx++
    }
    return idx
  }

  const start = (id: string) => (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const from = events.findIndex(x => x.id === id)
    setDrag({ id, startY: e.clientY, dy: 0, to: from })
    const move = (ev: globalThis.PointerEvent) => {
      setDrag(d => (d ? { ...d, dy: ev.clientY - d.startY, to: targetIndex(ev.clientY, id) } : d))
    }
    const end = (ev: globalThis.PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      const to = targetIndex(ev.clientY, id)
      setDrag(null)
      if (to !== from) void store.moveEvent(date, id, to)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }

  const others = drag ? events.filter(e => e.id !== drag.id) : events
  const bar = <div className="h-2 rounded-full bg-orange" aria-hidden />

  return (
    <div className="flex flex-col gap-3">
      {events.map(e => {
        const isDragged = drag?.id === e.id
        const posInOthers = others.findIndex(o => o.id === e.id)
        return (
          <div key={e.id} className="flex flex-col gap-3">
            {drag && !isDragged && drag.to === posInOthers && bar}
            <div
              ref={el => {
                if (el) rows.current.set(e.id, el)
                else rows.current.delete(e.id)
              }}
              style={isDragged ? { transform: `translateY(${drag.dy}px)`, zIndex: 10, position: 'relative' } : undefined}
            >
              <EventRow event={e} dragging={isDragged} onOpen={() => onOpen(e.id)} onTime={() => onTime(e.id)} onGrip={start(e.id)} />
            </div>
          </div>
        )
      })}
      {drag && drag.to === others.length && bar}
    </div>
  )
}
