import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { addDays, longDate, today } from '../../lib/dates'
import { useStore } from '../../lib/store'
import type { ISODate, Tab } from '../../types'
import { BigButton } from '../ui/BigButton'
import { Photo } from '../ui/Photo'
import { Symbol } from '../ui/Symbol'
import { TopBar } from '../ui/TopBar'
import { useSwipe } from '../ui/useSwipe'
import { ItemPicker } from '../pickers/ItemPicker'
import { AddEventFlow } from './AddEventFlow'
import { EventRow } from './EventRow'
import { EventSheet } from './EventSheet'
import { PhotoStrip } from './PhotoStrip'

interface Props {
  date: ISODate
  from: Tab
}

export function DayView({ date, from }: Props) {
  const store = useStore()
  const [openId, setOpenId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [pickStay, setPickStay] = useState(false)

  const events = store.eventsFor(date)
  const staying = store.stayingAt(date)
  const birthdays = store.birthdaysOn(date)
  const isToday = date === today()

  const goDay = (d: ISODate) => store.go({ kind: 'day', date: d, from })

  /** Template rows are virtual until first touched; write them before editing. */
  const open = async (id: string) => {
    const map = await store.materializeDay(date)
    setOpenId(map[id] ?? id)
  }
  const swipe = useSwipe(() => goDay(addDays(date, 1)), () => goDay(addDays(date, -1)))

  const back = () => {
    if (from === 'today') store.go({ kind: 'today' })
    else if (from === 'week') store.go({ kind: 'week', date })
    else if (from === 'month') store.go({ kind: 'month', date })
    else store.go({ kind: 'photos' })
  }

  return (
    <div className="flex h-full flex-col" {...swipe}>
      <TopBar
        onBack={back}
        title={
          <span className={isToday ? 'text-orange-dark' : ''}>
            {longDate(date)}
          </span>
        }
        right={
          <div className="flex gap-2">
            <BigButton onClick={() => goDay(addDays(date, -1))} aria-label="Day before">
              <ChevronLeft size={40} strokeWidth={3} />
            </BigButton>
            <BigButton onClick={() => goDay(addDays(date, 1))} aria-label="Day after">
              <ChevronRight size={40} strokeWidth={3} />
            </BigButton>
          </div>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          {/* Where she is staying */}
          <button
            type="button"
            onClick={() => setPickStay(true)}
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
              <span className="text-3xl font-extrabold">{staying?.name ?? 'My house'}</span>
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

          {/* Events, in time order; ticked ones stay in place */}
          <div className="flex flex-col gap-3">
            {events.map(e => (
              <EventRow key={e.id} event={e} onOpen={() => void open(e.id)} />
            ))}
          </div>

          <PhotoStrip date={date} />
        </div>
      </div>

      {/* Primary action bottom-right for her right index finger */}
      <div className="flex justify-end border-t-4 border-line bg-paper px-3 py-2">
        <BigButton variant="primary" size="md" className="min-w-48" onClick={() => setAdding(true)}>
          <Plus size={44} strokeWidth={4} />
          Add
        </BigButton>
      </div>

      {openId && <EventSheet eventId={openId} date={date} onClose={() => setOpenId(null)} />}
      {adding && <AddEventFlow date={date} onClose={() => setAdding(false)} />}
      {pickStay && (
        <ItemPicker
          kind="place"
          title="Staying at"
          symbol="🛏️"
          allowNone
          onBack={() => setPickStay(false)}
          onDone={ids => {
            void store.setStayingAt(date, ids[0] ?? null)
            setPickStay(false)
          }}
        />
      )}
    </div>
  )
}
