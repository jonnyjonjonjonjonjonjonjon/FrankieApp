import { useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { addMonths, DAY_SHORT, dayNumber, monthGrid, monthName, today, year } from '../../lib/dates'
import { useStore } from '../../lib/store'
import type { ISODate } from '../../types'
import { BigButton } from '../ui/BigButton'
import { Symbol } from '../ui/Symbol'
import { TopBar } from '../ui/TopBar'
import { useSwipe } from '../ui/useSwipe'
import { YearPicker } from './YearPicker'

/** Month grid with large numbered days, today in orange, and a year picker (PRD §4.3). */
export function MonthView({ date }: { date: ISODate }) {
  const store = useStore()
  const [pickYear, setPickYear] = useState(false)
  const cells = monthGrid(date)
  const goMonth = (d: ISODate) => store.go({ kind: 'month', date: d })
  const swipe = useSwipe(() => goMonth(addMonths(date, 1)), () => goMonth(addMonths(date, -1)))
  const home = store.state.settings.homePlaceId

  return (
    <div className="flex h-full flex-col" {...swipe}>
      <TopBar
        title={
          <button type="button" onClick={() => setPickYear(true)} className="flex items-center gap-3 text-left">
            <span className="text-4xl">{monthName(date)}</span>
            <span className="text-4xl text-ink-soft">{year(date)}</span>
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
      <div className="min-h-0 flex-1 p-3">
        <div
          className="month-grid mx-auto grid max-w-5xl grid-cols-7 gap-2 sm:h-full"
          style={{ '--rows': cells.length / 7 } as React.CSSProperties}
        >
          {DAY_SHORT.map(d => (
            <div key={d} className="text-center text-xl font-extrabold text-ink-soft">
              {d}
            </div>
          ))}
          {cells.map((d, i) => {
            if (!d) return <div key={`pad-${i}`} />
            const isToday = d === today()
            const rec = store.state.days[d]
            const away = rec?.stayingAtId && rec.stayingAtId !== home ? store.state.items[rec.stayingAtId] : null
            const birthday = store.birthdaysOn(d).length > 0
            const photos = store.photosFor(d).length > 0
            return (
              <button
                key={d}
                type="button"
                onClick={() => store.go({ kind: 'day', date: d, from: 'month' })}
                className={`flex aspect-square min-h-0 flex-col items-center justify-center rounded-2xl border-4 p-1 active:scale-95 sm:aspect-auto ${
                  isToday ? 'border-orange-dark bg-orange text-white' : 'border-ink bg-paper'
                }`}
              >
                <span className="text-3xl font-extrabold leading-none">{dayNumber(d)}</span>
                <span className="flex flex-wrap justify-center gap-0.5">
                  {away && <Symbol symbol={away.symbol} size="text-3xl" />}
                  {birthday && <Symbol symbol="🎂" size="text-3xl" />}
                  {photos && <Symbol symbol="📷" size="text-3xl" />}
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
