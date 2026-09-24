import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, DAY_SHORT, dayNumber, monthName, today, weekDates, weekdayIndex, year } from '../../lib/dates'
import { eventFace } from '../../lib/eventFace'
import { useStore } from '../../lib/store'
import { eventTypeInfo, RATING_FACES } from '../../lib/symbols'
import { isDaytime, to12 } from '../../lib/time'
import type { DiaryEvent, EventType, ISODate } from '../../types'
import { BigButton } from '../ui/BigButton'
import { Photo } from '../ui/Photo'
import { Symbol } from '../ui/Symbol'
import { TopBar } from '../ui/TopBar'

const MEALS: EventType[] = ['breakfast', 'lunch', 'dinner']

/** One whiteboard meal line: meal symbol, then the food chosen (or a dash). */
function MealCell({ type, ev }: { type: EventType; ev: DiaryEvent | undefined }) {
  const store = useStore()
  const items = store.state.items
  const foods = ev ? ev.foodIds.map(id => items[id]).filter(Boolean) : []
  return (
    <div className="flex min-h-14 items-start gap-2 border-t-2 border-line px-1 py-1" aria-label={eventTypeInfo(type).word}>
      <Symbol symbol={eventTypeInfo(type).symbol} size="text-3xl" className="shrink-0" />
      <span className="flex min-w-0 flex-col gap-0.5 text-lg font-bold leading-tight">
        {foods.length === 0 ? (
          <span className="text-line">—</span>
        ) : (
          foods.map(f => (
            <span key={f.id} className="min-w-0">
              {f.name}
            </span>
          ))
        )}
      </span>
    </div>
  )
}

/** The whiteboard, bigger: a Monday–Sunday table (PRD §4.2). */
export function WeekView({ date }: { date: ISODate }) {
  const store = useStore()
  const days = weekDates(date)
  const first = days[0]
  const last = days[6]
  const goWeek = (d: ISODate) => store.go({ kind: 'week', date: d })
  const items = store.state.items
  const range =
    monthName(first) === monthName(last)
      ? `${dayNumber(first)} – ${dayNumber(last)} ${monthName(last)} ${year(last)}`
      : `${dayNumber(first)} ${monthName(first)} – ${dayNumber(last)} ${monthName(last)} ${year(last)}`

  return (
    <div className="flex h-full flex-col">
      <TopBar
        title={range}
        right={
          <div className="flex gap-2">
            <BigButton onClick={() => goWeek(addDays(date, -7))} aria-label="Week before">
              <ChevronLeft size={40} strokeWidth={3} />
            </BigButton>
            <BigButton onClick={() => goWeek(addDays(date, 7))} aria-label="Week after">
              <ChevronRight size={40} strokeWidth={3} />
            </BigButton>
          </div>
        }
      />
      {/* The day/date headers are their own row, sticky inside the same scroll
          area as the columns, so they stay at the top when scrolling down and
          stay lined up when scrolling sideways on phones. */}
      <div className="flex-1 overflow-auto p-3 pt-0">
        <div className="min-w-[1080px]">
          <div className="sticky top-0 z-10 grid grid-cols-7 gap-2 bg-paper pt-3">
            {days.map(d => {
              const isToday = d === today()
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => store.go({ kind: 'day', date: d, from: 'week' })}
                  className={`flex min-h-20 flex-col items-center justify-center rounded-t-3xl border-4 border-b-0 px-1 py-1 ${
                    isToday ? 'border-orange bg-orange text-white' : 'border-ink bg-soft'
                  }`}
                >
                  <span className="text-xl font-extrabold">{DAY_SHORT[weekdayIndex(d)]}</span>
                  <span className="text-3xl font-extrabold leading-none">{dayNumber(d)}</span>
                </button>
              )
            })}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {days.map(d => {
              const isToday = d === today()
              const events = store.eventsFor(d)
              const meals = MEALS.map(m => events.find(e => e.type === m))
              const others = events.filter(e => !MEALS.includes(e.type))
              const staying = store.stayingAt(d)
              const birthdays = store.birthdaysOn(d)
              const photos = store.photosFor(d)
              return (
                <div key={d} className={`flex flex-col rounded-b-3xl border-4 border-t-0 ${isToday ? 'border-orange' : 'border-ink'} bg-paper`}>
                  {/* Birthdays band */}
                  {birthdays.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 border-t-2 border-line bg-orange-light px-1 py-1 text-lg font-bold">
                      <Symbol symbol="🎂" size="text-3xl" />
                      {birthdays.map(p => p.name).join(' · ')}
                    </div>
                  )}

                  {/* Staying at — in a narrow column the picture sits above the name, so words are not split */}
                  <div className="@container bg-sky">
                    <div className="flex min-h-14 items-center gap-2 px-1 py-1 @max-[10rem]:flex-col @max-[10rem]:gap-1 @max-[10rem]:text-center">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-paper">
                        {staying?.photoId && staying.showPhoto ? (
                          <Photo id={staying.photoId} className="h-full w-full" />
                        ) : (
                          <Symbol symbol={staying?.symbol ?? '🏠'} size="text-4xl" />
                        )}
                      </div>
                      <span className="min-w-0 text-sm font-bold leading-tight break-words">{staying?.name ?? 'Rochester Road'}</span>
                    </div>
                  </div>

                  {MEALS.map((m, i) => (
                    <MealCell key={m} type={m} ev={meals[i]} />
                  ))}

                  <div className="flex flex-1 flex-col gap-1 border-t-4 border-line p-1">
                    {others.map(e => {
                      const face = eventFace(e, items)
                      const t = e.time ? to12(e.time) : null
                      return (
                        <div key={e.id} className="flex flex-col gap-0.5 rounded-xl px-1 py-1">
                          <div className="flex items-center gap-2">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-soft">
                              {face.photoId && face.showPhoto ? (
                                <Photo id={face.photoId} className="h-full w-full" />
                              ) : (
                                <Symbol symbol={face.symbol} size="text-4xl" />
                              )}
                            </div>
                            {t && (
                              <span className="text-sm font-bold whitespace-nowrap text-ink-soft">
                                {t.clock} {t.ampm} <Symbol symbol={e.time && isDaytime(e.time) ? '☀️' : '🌙'} size="text-base" className="align-middle" />
                              </span>
                            )}
                          </div>
                          <span className="text-lg font-extrabold leading-tight break-words">
                            {face.word}
                            {e.rating && <Symbol symbol={RATING_FACES[e.rating].symbol} size="text-xl" className="ml-1 align-middle" />}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Photos from the day */}
                  {photos.length > 0 && (
                    <button
                      type="button"
                      onClick={() => store.go({ kind: 'day', date: d, from: 'week' })}
                      className="grid grid-cols-3 gap-1 border-t-2 border-line p-1"
                      aria-label="Photos"
                    >
                      {photos.slice(0, 6).map(p => (
                        <Photo key={p.id} id={p.id} className="aspect-square w-full rounded-lg" />
                      ))}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
