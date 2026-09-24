import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addMonths, DAY_SHORT, dayNumber, monthGrid, monthName, today, year } from '../../lib/dates'
import { useStore } from '../../lib/store'
import type { ISODate, LibraryItem } from '../../types'
import { BigButton } from '../ui/BigButton'
import { Photo } from '../ui/Photo'
import { Symbol } from '../ui/Symbol'
import { SlideCarousel } from '../ui/SlideCarousel'

function Face({ item, size = 'text-2xl' }: { item: LibraryItem; size?: string }) {
  return item.photoId && item.showPhoto ? (
    <Photo id={item.photoId} alt={item.name} className="h-[1.6em] w-[1.6em] rounded-md" />
  ) : (
    <Symbol symbol={item.symbol} size={size} />
  )
}

/**
 * Month grid, cells as large as the screen allows. Each day shows the things
 * that matter ahead of time: staying somewhere other than home, a doctor or
 * dentist visit, and anyone coming to see her. Months slide like days (the
 * same carousel), with the arrows either side of the centred title.
 */
export function MonthView({ date }: { date: ISODate }) {
  const [slide, setSlide] = useState<{ dir: -1 | 1; n: number } | null>(null)
  const store = useStore()
  const goMonth = (d: ISODate) => store.go({ kind: 'month', date: d })
  const step = (dir: -1 | 1) => setSlide(s => ({ dir, n: (s?.n ?? 0) + 1 }))

  return (
    <div className="flex h-full flex-col">
      {/* Title centred on the screen; its fixed width (September is the longest) keeps the arrows still */}
      <header className="flex items-center justify-center gap-3 border-b-4 border-line bg-paper px-3 py-1 sm:py-2">
        <BigButton onClick={() => step(-1)} aria-label="Month before">
          <ChevronLeft size={40} strokeWidth={3} />
        </BigButton>
        <h2 className="min-w-[9.5em] text-center text-xl font-extrabold leading-tight sm:text-3xl">
          <span>{monthName(date)}</span> <span className="text-ink-soft">{year(date)}</span>
        </h2>
        <BigButton onClick={() => step(1)} aria-label="Month after">
          <ChevronRight size={40} strokeWidth={3} />
        </BigButton>
      </header>
      <div className="min-h-0 flex-1">
        <SlideCarousel
          centre={date.slice(0, 7)}
          request={slide}
          onSettle={dir => goMonth(addMonths(date, dir))}
          render={o => <MonthGrid date={addMonths(date, o)} />}
        />
      </div>
    </div>
  )
}

/** One month's grid (a carousel panel). Scrolls on small landscape phones. */
function MonthGrid({ date }: { date: ISODate }) {
  const store = useStore()
  const cells = monthGrid(date)
  const { items, settings } = store.state
  const home = settings.homePlaceId
  const todayIso = today()

  return (
    <div className="h-full overflow-y-auto p-2">
      <div
        className="month-grid mx-auto grid max-w-6xl grid-cols-7 gap-1.5 sm:h-full"
        style={{ '--rows': cells.length / 7 } as React.CSSProperties}
      >
        {DAY_SHORT.map(d => (
          <div key={d} className="text-center text-base font-extrabold text-ink-soft">
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={`pad-${i}`} />
          const isToday = d === todayIso
          const rec = store.state.days[d]
          const away = rec?.stayingAtId && rec.stayingAtId !== home ? items[rec.stayingAtId] : null
          const events = store.eventsFor(d)
          const medical = events.some(e => e.placeId && items[e.placeId]?.placeType === 'medical')
          const people = [...new Set(events.flatMap(e => e.personIds))].map(id => items[id]).filter(Boolean)
          const birthdays = store.birthdaysOn(d)
          return (
            <button
              key={d}
              type="button"
              onClick={() => store.go({ kind: 'day', date: d, from: 'month' })}
              className={`flex aspect-square min-h-0 flex-col rounded-2xl border-4 p-1 text-left active:scale-95 sm:aspect-auto ${
                isToday ? 'border-orange-dark bg-orange text-white' : away ? 'border-ink bg-sky' : 'border-ink bg-paper'
              }`}
            >
              <span className="text-xl font-extrabold leading-none sm:text-2xl">{dayNumber(d)}</span>
              <span className="mt-auto flex flex-wrap items-end gap-x-1 gap-y-0.5 overflow-hidden">
                {away && (
                  <span className="inline-flex max-w-full items-center gap-1 text-sm font-bold sm:text-base">
                    <Face item={away} />
                    <span className="hidden truncate sm:inline">{away.name}</span>
                  </span>
                )}
                {medical && <Symbol symbol="🩺" size="text-2xl" />}
                {people.slice(0, 3).map(p => (
                  <Face key={p.id} item={p} />
                ))}
                {/* Cake and whose birthday it is (two faces fit a cell; more shows as +N) */}
                {birthdays.length > 0 && (
                  <span className="inline-flex items-center gap-0.5" aria-label={`${birthdays.map(p => p.name).join(' and ')} birthday`}>
                    <Symbol symbol="🎂" size="text-2xl" />
                    {birthdays.slice(0, 2).map(p => (
                      <Face key={p.id} item={p} />
                    ))}
                    {birthdays.length > 2 && <span className="text-base font-extrabold">+{birthdays.length - 2}</span>}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
