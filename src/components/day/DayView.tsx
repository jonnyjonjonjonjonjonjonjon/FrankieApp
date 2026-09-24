import { useState } from 'react'
import { ChevronLeft, ChevronRight, Settings as SettingsIcon } from 'lucide-react'
import { addDays, longDate, today } from '../../lib/dates'
import { useStore } from '../../lib/store'
import type { Id, ISODate, Tab } from '../../types'
import { BigButton } from '../ui/BigButton'
import { SlideCarousel } from '../ui/SlideCarousel'
import { TopBar } from '../ui/TopBar'
import { ItemPicker } from '../pickers/ItemPicker'
import { TimePicker } from '../pickers/TimePicker'
import { DayPanel } from './DayPanel'
import { EventSheet } from './EventSheet'
import { InlineAdd } from './InlineAdd'

/** How long a newly added row keeps its arrival animation class. */
const FRESH_MS = 600

interface Props {
  date: ISODate
  from: Tab
}

export function DayView({ date, from }: Props) {
  const store = useStore()
  const [openId, setOpenId] = useState<string | null>(null)
  const [timeId, setTimeId] = useState<string | null>(null)
  // The add card: open at a place in this day's list (a new day closes it).
  const [compose, setCompose] = useState<{ date: ISODate; index: number } | null>(null)
  // Changing day (arrow, swipe or tab) closes it, so coming back never finds it still open.
  if (compose && compose.date !== date) setCompose(null)
  const composeAt = compose?.date === date ? compose.index : null
  // The row just added, so it arrives with a short rise.
  const [fresh, setFresh] = useState<Id | null>(null)
  const [pickStay, setPickStay] = useState(false)
  const [slide, setSlide] = useState<{ dir: -1 | 1; n: number } | null>(null)
  const isToday = date === today()
  const composing = composeAt !== null

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
            {/* Off while the add card is open, like the swipe: changing day would throw away what she has picked. */}
            <BigButton disabled={composing} onClick={() => setSlide(s => ({ dir: -1, n: (s?.n ?? 0) + 1 }))} aria-label="Day before">
              <ChevronLeft size={40} strokeWidth={3} />
            </BigButton>
            <BigButton disabled={composing} onClick={() => setSlide(s => ({ dir: 1, n: (s?.n ?? 0) + 1 }))} aria-label="Day after">
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
          locked={composing}
          onSettle={dir => goDay(addDays(date, dir))}
          render={o => (
            <DayPanel
              date={addDays(date, o)}
              onOpen={id => void open(id)}
              onTime={id => void openTime(id)}
              onPickStay={() => setPickStay(true)}
              interactive={o === 0}
              composeAt={o === 0 ? composeAt : null}
              composer={
                o === 0 &&
                composeAt !== null && (
                  <InlineAdd
                    date={date}
                    index={composeAt}
                    onClose={id => {
                      setCompose(null)
                      setFresh(id ?? null)
                      // Only its arrival animates: gone again before the row could remount (a swipe back).
                      if (id) setTimeout(() => setFresh(f => (f === id ? null : f)), FRESH_MS)
                    }}
                  />
                )
              }
              onCompose={index => {
                setFresh(null)
                setCompose({ date, index })
              }}
              freshId={o === 0 ? fresh : null}
            />
          )}
        />
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
