import { Settings as SettingsIcon } from 'lucide-react'
import { addDays, dayName, longDate, today } from '../../lib/dates'
import { eventFace } from '../../lib/eventFace'
import { useStore } from '../../lib/store'
import { minutesOf, nowHHMM } from '../../lib/time'
import type { DiaryEvent } from '../../types'
import { BigButton } from '../ui/BigButton'
import { Clock } from '../ui/Clock'
import { useNow } from '../ui/useNow'
import { Photo } from '../ui/Photo'
import { Symbol } from '../ui/Symbol'
import { TimeLabel } from '../ui/TimeLabel'
import { TopBar } from '../ui/TopBar'

function BigTile({ event, dayWord, onClick }: { event: DiaryEvent | null; dayWord?: string; onClick: () => void }) {
  const store = useStore()
  if (!event) {
    return (
      <button type="button" onClick={onClick} className="flex min-h-0 flex-1 items-center justify-center rounded-3xl border-4 border-line bg-soft">
        <Symbol symbol="🌙" size="text-7xl" className="opacity-60" />
      </button>
    )
  }
  const face = eventFace(event, store.state.items)
  const foods = event.foodIds.map(id => store.state.items[id]).filter(Boolean)
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-0 flex-1 items-center gap-5 rounded-3xl border-4 border-ink bg-paper px-5 py-3 text-left active:scale-[0.98]"
    >
      <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-soft">
        {face.photoId && face.showPhoto ? (
          <Photo id={face.photoId} alt={face.word} className="h-full w-full" />
        ) : (
          <Symbol symbol={face.symbol} size="text-7xl" />
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        {dayWord && <span className="text-2xl font-bold text-ink-soft">{dayWord}</span>}
        <span className="truncate text-5xl font-extrabold leading-tight">{face.word}</span>
        {foods.length > 0 && (
          <span className="flex flex-wrap gap-3 text-2xl font-bold text-ink-soft">
            {foods.map(f => (
              <span key={f.id} className="inline-flex items-center gap-1">
                <Symbol symbol={f.symbol} size="text-4xl" /> {f.name}
              </span>
            ))}
          </span>
        )}
        <TimeLabel time={event.time} size="lg" />
      </div>
    </button>
  )
}

/** Home: now and next (PRD §4.1). Position carries the meaning — no sequence words. */
export function TodayView() {
  const store = useStore()
  const now = useNow()
  const date = today()
  const nowMins = minutesOf(nowHHMM(now))
  const events = store.eventsFor(date)
  const started = events.filter(e => minutesOf(e.time) <= nowMins)
  const current = started.length ? started[started.length - 1] : null
  let next = events.find(e => minutesOf(e.time) > nowMins) ?? null
  let nextDayWord: string | undefined
  if (!next) {
    const tomorrow = addDays(date, 1)
    next = store.eventsFor(tomorrow)[0] ?? null
    if (next) nextDayWord = dayName(tomorrow)
  }
  const openDay = () => store.go({ kind: 'day', date, from: 'today' })

  return (
    <div className="flex h-full flex-col">
      <TopBar
        title={<span className="text-orange-dark">{longDate(date)}</span>}
        right={
          <BigButton size="sm" variant="ghost" onClick={() => store.go({ kind: 'settings' })} aria-label="Family settings">
            <SettingsIcon size={32} strokeWidth={2.5} />
            <span className="text-lg">Family</span>
          </BigButton>
        }
      />
      <div className="flex min-h-0 flex-1 flex-col px-3 py-3">
        <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-3">
          <Clock />
          <BigTile event={current} onClick={openDay} />
          <BigTile event={next} dayWord={nextDayWord} onClick={openDay} />
        </div>
      </div>
    </div>
  )
}
