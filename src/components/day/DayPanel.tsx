import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { useStore } from '../../lib/store'
import { today } from '../../lib/dates'
import { festiveOn } from '../../lib/festive'
import { minutesOf, nowHHMM } from '../../lib/time'
import { useNow } from '../ui/useNow'
import type { Id, ISODate } from '../../types'
import { Photo } from '../ui/Photo'
import { Symbol } from '../ui/Symbol'
import { DayEvents } from './DayEvents'
import { PhotoStrip } from './PhotoStrip'

interface Props {
  date: ISODate
  onOpen: (id: string) => void
  onPickStay: () => void
  /** The centre panel (the + buttons and dragging work); neighbours only look the same. */
  interactive?: boolean
  /** The add card and where in the list it is open. */
  composeAt?: number | null
  composer?: ReactNode
  onCompose?: (index: number) => void
  freshId?: Id | null
}

/** Everything that slides when you swipe between days: staying-at, a festive day, birthdays, the list, photos. */
export function DayPanel({ date, onOpen, onPickStay, interactive = true, composeAt, composer, onCompose, freshId }: Props) {
  const store = useStore()
  const events = store.eventsFor(date)
  const staying = store.stayingAt(date)
  const festive = festiveOn(date)
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
    // The add card's sticky header and footer stick to this scroller: nothing between them may set overflow.
    // (Positioned, so the card can measure its place in it with offsetTop.)
    <div ref={scroller} data-day-scroller className="relative h-full overflow-y-auto px-3 py-3">
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

        {festive && (
          <div className={`flex min-h-20 items-center gap-4 rounded-3xl border-4 px-4 py-2 ${festive.border} ${festive.bg}`}>
            <Symbol symbol={festive.symbol} size="text-6xl" />
            <span className="min-w-0 break-words text-3xl font-extrabold">{festive.word}</span>
          </div>
        )}

        {birthdays.map(p => (
          <div key={p.id} className="flex min-h-20 items-center gap-4 rounded-3xl border-4 border-orange bg-orange-light px-4 py-2">
            <Symbol symbol="🎂" size="text-6xl" />
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-paper">
              {p.photoId && p.showPhoto ? <Photo id={p.photoId} alt={p.name} className="h-full w-full" /> : <Symbol symbol={p.symbol} size="text-5xl" />}
            </div>
            <span className="min-w-0 break-words text-3xl font-extrabold">{p.name}</span>
            {/* The cake says it on a narrow phone; the word joins it where there is room */}
            <span className="text-2xl font-bold text-ink-soft max-sm:sr-only">Birthday</span>
            {p.birthYear && Number(date.slice(0, 4)) > p.birthYear && (
              <span className="ml-auto flex h-16 min-w-16 shrink-0 items-center justify-center rounded-full bg-orange px-3 text-3xl font-extrabold text-white" aria-label="Age">
                {Number(date.slice(0, 4)) - p.birthYear}
              </span>
            )}
          </div>
        ))}

        <DayEvents
          date={date}
          events={events}
          currentId={currentId}
          onOpen={onOpen}
          interactive={interactive}
          composeAt={composeAt}
          composer={composer}
          onCompose={onCompose}
          freshId={freshId}
        />

        <PhotoStrip date={date} />
      </div>
    </div>
  )
}
