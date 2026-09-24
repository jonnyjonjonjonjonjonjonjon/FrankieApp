import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Settings as SettingsIcon } from 'lucide-react'
import { addDays, longDate, today } from '../../lib/dates'
import { useStore } from '../../lib/store'
import type { ISODate, Tab } from '../../types'
import { BigButton } from '../ui/BigButton'
import { SlideCarousel } from '../ui/SlideCarousel'
import { TopBar } from '../ui/TopBar'
import { ItemPicker } from '../pickers/ItemPicker'
import { TimePicker } from '../pickers/TimePicker'
import { AddEventFlow } from './AddEventFlow'
import { DayPanel } from './DayPanel'
import { EventSheet } from './EventSheet'

interface Props {
  date: ISODate
  from: Tab
}

export function DayView({ date, from }: Props) {
  const store = useStore()
  const [openId, setOpenId] = useState<string | null>(null)
  const [timeId, setTimeId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [pickStay, setPickStay] = useState(false)
  const [slide, setSlide] = useState<{ dir: -1 | 1; n: number } | null>(null)
  const isToday = date === today()

  const goDay = (d: ISODate) => store.go({ kind: 'day', date: d, from })

  /** Template rows are virtual until first touched; write them before editing. */
  const open = async (id: string) => {
    const map = await store.materializeDay(date)
    setOpenId(map[id] ?? id)
  }
  const openTime = async (id: string) => {
    const map = await store.materializeDay(date)
    setTimeId(map[id] ?? id)
  }

  const back = () => {
    if (from === 'today') store.go({ kind: 'today' })
    else if (from === 'week') store.go({ kind: 'week', date })
    else if (from === 'month') store.go({ kind: 'month', date })
    else store.go({ kind: 'photos' })
  }

  const timeEvent = timeId ? store.state.events[timeId] : null

  return (
    <div className="flex h-full flex-col">
      <TopBar
        wrapTitle
        onBack={from === 'today' ? undefined : back}
        title={<span className={isToday ? 'text-orange-dark' : ''}>{longDate(date)}</span>}
        right={
          <div className="flex items-center gap-2">
            <BigButton onClick={() => setSlide(s => ({ dir: -1, n: (s?.n ?? 0) + 1 }))} aria-label="Day before">
              <ChevronLeft size={40} strokeWidth={3} />
            </BigButton>
            <BigButton onClick={() => setSlide(s => ({ dir: 1, n: (s?.n ?? 0) + 1 }))} aria-label="Day after">
              <ChevronRight size={40} strokeWidth={3} />
            </BigButton>
            {from === 'today' && (
              <>
                <span className="text-xs text-ink-soft" aria-label="App version">
                  v{__APP_VERSION__}
                </span>
                <BigButton size="sm" variant="ghost" onClick={() => store.go({ kind: 'settings' })} aria-label="Family settings">
                  <SettingsIcon size={32} strokeWidth={2.5} />
                  <span className="text-lg">Family</span>
                </BigButton>
              </>
            )}
          </div>
        }
      />

      <div className="min-h-0 flex-1">
        <SlideCarousel
          centre={date}
          request={slide}
          onSettle={dir => goDay(addDays(date, dir))}
          render={o => (
            <DayPanel date={addDays(date, o)} onOpen={id => void open(id)} onTime={id => void openTime(id)} onPickStay={() => setPickStay(true)} />
          )}
        />
      </div>

      {/* Primary action bottom-right for her right index finger */}
      <div className="flex justify-end border-t-4 border-line bg-paper px-3 py-2">
        <BigButton variant="primary" size="md" className="min-w-48" onClick={() => setAdding(true)}>
          <Plus size={44} strokeWidth={4} />
          Add
        </BigButton>
      </div>

      {openId && <EventSheet eventId={openId} date={date} onClose={() => setOpenId(null)} />}
      {timeEvent && (
        <TimePicker
          value={timeEvent.time ?? '10:00'}
          allowNone={Boolean(timeEvent.time)}
          onBack={() => setTimeId(null)}
          onDone={t => {
            void store.setEventTime(date, timeEvent.id, t)
            setTimeId(null)
          }}
        />
      )}
      {adding && <AddEventFlow date={date} onClose={() => setAdding(false)} />}
      {pickStay && (
        <ItemPicker
          kind="place"
          title="Staying at"
          symbol="🛏️"
          subset={store.stayPlaces()}
          newItemExtra={{ stayable: true, placeType: 'accommodation' }}
          onBack={() => setPickStay(false)}
          onDone={ids => {
            const id = ids[0] ?? null
            void store.setStayingAt(date, id === store.state.settings.homePlaceId ? null : id)
            setPickStay(false)
          }}
        />
      )}
    </div>
  )
}
