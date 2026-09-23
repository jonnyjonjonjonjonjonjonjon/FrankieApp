import { useLayoutEffect, useRef } from 'react'
import { useStore } from '../../lib/store'
import { today } from '../../lib/dates'
import { minutesOf, nowHHMM } from '../../lib/time'
import { useNow } from '../ui/useNow'
import type { ISODate } from '../../types'
import { Photo } from '../ui/Photo'
import { Symbol } from '../ui/Symbol'
import { DayEvents } from './DayEvents'
import { PhotoStrip } from './PhotoStrip'

interface Props {
  date: ISODate
  onOpen: (id: string) => void
  onTime: (id: string) => void
  onPickStay: () => void
}

/** Everything that slides when you swipe between days: staying-at, birthdays, the list, photos. */
export function DayPanel({ date, onOpen, onTime, onPickStay }: Props) {
  const store = useStore()
  const events = store.eventsFor(date)
  const staying = store.stayingAt(date)
  const birthdays = store.birthdaysOn(date)
  const now = useNow()
  // A day that has just arrived always starts at the top (before paint, so no jump).
  const scroller = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    scroller.current?.scrollTo(0, 0)
  }, [date])
  // Today: the last timed row whose time has passed is where the day has got to.
  let currentId: string | null = null
  if (date === today()) {
    const mins = minutesOf(nowHHMM(now))
    for (const e of events) if (e.time && minutesOf(e.time) <= mins) currentId = e.id
  }

  return (
    <div ref={scroller} className="h-full overflow-y-auto px-3 py-3">
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <button
          type="button"
          onClick={onPickStay}
          className="flex min-h-20 items-center gap-4 rounded-3xl border-4 border-line bg-sky px-4 py-1 text-left active:scale-[0.98]"
        >
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-paper">
            {staying?.photoId && staying.showPhoto ? (
              <Photo id={staying.photoId} alt={staying.name} className="h-full w-full" />
            ) : (
              <Symbol symbol={staying?.symbol ?? '🏠'} size="text-5xl" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-ink-soft">Staying at</span>
            <span className="text-3xl font-extrabold">{staying?.name ?? 'Rochester Road'}</span>
          </div>
        </button>

        {birthdays.map(p => (
          <div key={p.id} className="flex min-h-20 items-center gap-4 rounded-3xl border-4 border-orange bg-orange-light px-4 py-2">
            <Symbol symbol="🎂" size="text-6xl" />
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-paper">
              {p.photoId ? <Photo id={p.photoId} alt={p.name} className="h-full w-full" /> : <Symbol symbol={p.symbol} size="text-5xl" />}
            </div>
            <span className="text-3xl font-extrabold">{p.name}</span>
            <span className="text-2xl font-bold text-ink-soft">Birthday</span>
          </div>
        ))}

        <DayEvents date={date} events={events} currentId={currentId} onOpen={onOpen} onTime={onTime} />

        <PhotoStrip date={date} />
      </div>
    </div>
  )
}
