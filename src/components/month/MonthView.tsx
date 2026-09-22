import { useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { addMonths, DAY_SHORT, dayNumber, monthGrid, monthName, today, year } from '../../lib/dates'
import { useStore } from '../../lib/store'
import type { ISODate, LibraryItem } from '../../types'
import { BigButton } from '../ui/BigButton'
import { Photo } from '../ui/Photo'
import { Symbol } from '../ui/Symbol'
import { TopBar } from '../ui/TopBar'
import { useSwipe } from '../ui/useSwipe'
import { YearPicker } from './YearPicker'

function Face({ item, size = 'text-2xl' }: { item: LibraryItem; size?: string }) {
  return item.photoId ? (
    <Photo id={item.photoId} alt={item.name} className="h-[1.6em] w-[1.6em] rounded-md" />
  ) : (
    <Symbol symbol={item.symbol} size={size} />
  )
}

/**
 * Month grid, cells as large as the screen allows. Each day shows the things
 * that matter ahead of time: staying somewhere other than home, a doctor or
 * dentist visit, and anyone coming to see her.
 */
export function MonthView({ date }: { date: ISODate }) {
  const store = useStore()
  const [pickYear, setPickYear] = useState(false)
  const cells = monthGrid(date)
  const goMonth = (d: ISODate) => store.go({ kind: 'month', date: d })
  const swipe = useSwipe(() => goMonth(addMonths(date, 1)), () => goMonth(addMonths(date, -1)))
  const { items, settings } = store.state
  const home = settings.homePlaceId

  return (
    <div className="flex h-full flex-col" {...swipe}>
      <TopBar
        title={
          <button type="button" onClick={() => setPickYear(true)} className="flex items-center gap-3 text-left">
            <span>{monthName(date)}</span>
            <span className="text-ink-soft">{year(date)}</span>
          </button>
        }
        right={
          <div className="flex gap-2">
            <BigButton onClick={() => setPickYear(true)} aria-label="Pick a month">
              <CalendarDays size={36} strokeWidth={2.5} />
              <span>Year</span>
            </BigButton>
            <BigButton onClick={() => goMonth(addMonths(date, -1))} aria-label="Month before">
              <ChevronLeft size={40} strokeWidth={3} />
            </BigButton>
            <BigButton onClick={() => goMonth(addMonths(date, 1))} aria-label="Month after">
              <ChevronRight size={40} strokeWidth={3} />
            </BigButton>
          </div>
        }
      />
      <div className="min-h-0 flex-1 p-2">
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
            const isToday = d === today()
            const rec = store.state.days[d]
            const away = rec?.stayingAtId && rec.stayingAtId !== home ? items[rec.stayingAtId] : null
            const events = store.eventsFor(d)
            const medical = events.some(e => e.placeId && items[e.placeId]?.placeType === 'medical')
            const people = [...new Set(events.flatMap(e => e.personIds))].map(id => items[id]).filter(Boolean)
            const birthday = store.birthdaysOn(d).length > 0
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
                  {birthday && <Symbol symbol="🎂" size="text-2xl" />}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      {pickYear && (
        <YearPicker
          current={date}
          onBack={() => setPickYear(false)}
          onPick={m => {
            setPickYear(false)
            goMonth(m)
          }}
        />
      )}
    </div>
  )
}
