import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addMonths, DAY_SHORT, dayNumber, monthGrid, monthName, today, year } from '../../lib/dates'
import { festiveOn } from '../../lib/festive'
import { useStore } from '../../lib/store'
import { track } from '../../lib/usage'
import type { ISODate, LibraryItem } from '../../types'
import { BigButton } from '../ui/BigButton'
import { Photo } from '../ui/Photo'
import { Symbol } from '../ui/Symbol'
import { SlideCarousel } from '../ui/SlideCarousel'

function Face({ item, size = 'text-2xl', className = '' }: { item: LibraryItem; size?: string; className?: string }) {
  return item.photoId && item.showPhoto ? (
    <Photo id={item.photoId} alt={item.name} className={`h-[1.6em] w-[1.6em] shrink-0 rounded-md ${className}`} />
  ) : (
    <Symbol symbol={item.symbol} size={size} className={className} />
  )
}

/**
 * Month grid, cells as large as the screen allows. Each day shows the things
 * that matter ahead of time: staying somewhere other than home, a doctor or
 * dentist visit, birthdays, anyone coming to see her, and a festive day's
 * symbol at the top right (beside the number). Months slide like days (the
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
          onSettle={(dir, how) => {
            track(how === 'swipe' ? 'nav_swipe' : 'nav_arrow')
            goMonth(addMonths(date, dir))
          }}
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
          const festive = festiveOn(d)
          const crowded = birthdays.length > 0 || medical || people.length > 0
          const squeeze = !!away && birthdays.length > 2
          // Today's orange wins, then away (sky: where she sleeps stays clear); then the festive colours.
          const look = isToday
            ? 'border-orange-dark bg-orange text-white'
            : away
              ? 'border-ink bg-sky'
              : festive
                ? `${festive.border} ${festive.bg}`
                : 'border-ink bg-paper'
          return (
            <button
              key={d}
              type="button"
              onClick={() => store.go({ kind: 'day', date: d, from: 'month' })}
              className={`flex aspect-square min-h-0 flex-col overflow-hidden rounded-2xl border-4 p-1 text-left max-sm:min-h-auto max-sm:overflow-visible active:scale-95 sm:aspect-auto ${look}`}
            >
              {/* On phones the symbol reaches into the cell's padding to fit beside the number; on the
                  narrowest it drops under it (still at the right), and a square too small for what it
                  shows grows taller (phones have natural rows) rather than clip a birthday */}
              {/* Tablets: the symbol is the number's size, and this row may give up a few pixels (no
                  more than the number's empty descent) in a short 6-row month, so the bottom row fits */}
              <span className="flex flex-wrap items-start justify-between sm:min-h-[1.25rem] sm:shrink">
                <span className="text-xl font-extrabold leading-none sm:text-2xl">{dayNumber(d)}</span>
                {festive && (
                  <>
                    <Symbol symbol={festive.symbol} size="text-xl sm:text-2xl" className="ml-auto max-sm:-mt-0.5 max-sm:-mr-1" />
                    <span className="sr-only">{festive.word}</span>
                  </>
                )}
              </span>
              {/* One line on a landscape tablet (its cells have room for no more): what doesn't fit is
                  cut at the right, the least important last */}
              <span className="mt-auto flex shrink-0 flex-wrap items-end gap-x-1 gap-y-0.5 overflow-hidden sm:landscape:flex-nowrap">
                {away && (
                  <span className={`inline-flex max-w-full items-center gap-1 text-sm font-bold sm:text-base ${crowded ? 'shrink-0' : ''}`}>
                    <Face item={away} />
                    {/* The place name only when nothing else shares the row: it would push a birthday
                        onto a second line, below the bottom of a landscape tablet's cell */}
                    <span className={crowded ? 'sr-only' : 'hidden truncate sm:inline'}>{away.name}</span>
                  </span>
                )}
                {/* Cake and whose birthday it is, before visitors (two faces; more shows as +N; on a
                    phone the second face wraps under the cake, the cell grows) */}
                {birthdays.length > 0 && (
                  <span className="inline-flex flex-wrap items-center gap-0.5 sm:landscape:shrink-0 sm:landscape:flex-nowrap" aria-label={`${birthdays.map(p => p.name).join(' and ')} birthday`}>
                    {/* A size down on phones, so the cake and a face fit side by side */}
                    <Symbol symbol="🎂" size="text-xl sm:text-2xl" />
                    {/* Beside the house on a landscape tablet's one line, three or more birthdays show one
                        face and the +N (two faces and a +N would be cut off) */}
                    {birthdays.slice(0, 2).map((p, i) => (
                      <Face key={p.id} item={p} size="text-xl sm:text-2xl" className={i === 1 && squeeze ? 'sm:landscape:hidden' : ''} />
                    ))}
                    {birthdays.length > 2 && (
                      <span className="text-base font-extrabold">
                        {squeeze && <span className="hidden sm:landscape:inline">+{birthdays.length - 1}</span>}
                        <span className={squeeze ? 'sm:landscape:hidden' : ''}>+{birthdays.length - 2}</span>
                      </span>
                    )}
                  </span>
                )}
                {medical && <Symbol symbol="🩺" size="text-2xl" />}
                {people.slice(0, 3).map(p => (
                  <Face key={p.id} item={p} />
                ))}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
