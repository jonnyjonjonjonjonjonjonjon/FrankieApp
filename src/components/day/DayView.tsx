import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Settings as SettingsIcon } from 'lucide-react'
import { addDays, longDate, today } from '../../lib/dates'
import { isEmptyRow } from '../../lib/eventFace'
import { useStore } from '../../lib/store'
import { track } from '../../lib/usage'
import type { Id, ISODate, Tab } from '../../types'
import { BigButton } from '../ui/BigButton'
import { SlideCarousel } from '../ui/SlideCarousel'
import { TopBar } from '../ui/TopBar'
import { ItemPicker } from '../pickers/ItemPicker'
import { DayPanel } from './DayPanel'
import { RowEditor, type Slot } from './RowEditor'

/** How long a newly added row keeps its arrival animation class. */
const FRESH_MS = 600

interface Props {
  date: ISODate
  from: Tab
}

export function DayView({ date, from }: Props) {
  const store = useStore()
  // The open row (tapped) and which of its parts is being set, on this day only.
  const [open, setOpen] = useState<{ date: ISODate; id: Id; panel: Slot | null } | null>(null)
  if (open && open.date !== date) setOpen(null)
  // The row just added, so it arrives with a short rise.
  const [fresh, setFresh] = useState<Id | null>(null)
  const [pickStay, setPickStay] = useState(false)
  const [slide, setSlide] = useState<{ dir: -1 | 1; n: number } | null>(null)
  const isToday = date === today()
  // Choosing something for a row: changing day would throw the choice away, so the swipe and arrows wait.
  const composing = Boolean(open?.panel)

  // An empty row (a new one left as it came, or one with everything taken out) disappears, quietly,
  // once she moves on: another row, another day, another screen.
  const last = useRef<{ date: ISODate; id: Id } | null>(null)
  const dropIfEmpty = ({ date: d, id }: { date: ISODate; id: Id }) => {
    const ev = store.state.events[id]
    if (ev && !ev.deleted && isEmptyRow(ev)) void store.updateEvent(d, id, { deleted: true })
  }
  useEffect(() => {
    const was = last.current
    last.current = open ? { date: open.date, id: open.id } : null
    if (was && was.id !== open?.id) dropIfEmpty(was)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open?.id])
  useEffect(
    () => () => {
      if (last.current) dropIfEmpty(last.current)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const goDay = (d: ISODate) => store.go({ kind: 'day', date: d, from })

  /** Tap a row to open it (or close it again). Template rows are virtual until first touched: write them first. */
  const toggle = async (id: string) => {
    if (open?.id === id) return setOpen(null)
    track('event_open')
    const map = await store.materializeDay(date)
    setOpen({ date, id: map[id] ?? id, panel: null })
  }
  /** Tap a part of the open row: its choices open under it (tap it again to go back to the row's strip). */
  const slot = (id: Id, panel: Slot) => setOpen(o => (o && o.id === id ? { ...o, panel: o.panel === panel ? null : panel } : o))
  const openEvent = open ? store.state.events[open.id] : undefined
  /** A + between rows: a new, empty row there, open with its What? / Where? / Who? slots to fill. */
  const addRow = async (index: number) => {
    track('add_open')
    const ev = await store.addEvent({ date, index, type: 'activity' })
    setFresh(ev.id)
    // Only its arrival animates: gone again before the row could remount (a swipe back).
    setTimeout(() => setFresh(f => (f === ev.id ? null : f)), FRESH_MS)
    setOpen({ date, id: ev.id, panel: null })
  }

  const back = () => {
    if (from === 'today') store.go({ kind: 'today' })
    else if (from === 'week') store.go({ kind: 'week', date })
    else if (from === 'month') store.go({ kind: 'month', date })
    else store.go({ kind: 'photos' })
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar
        wrapTitle
        onBack={from === 'today' ? undefined : back}
        title={<span className={isToday ? 'text-orange-dark' : ''}>{longDate(date)}</span>}
        right={
          <div className="flex items-center gap-2">
            {/* Off while a row's choices are open, like the swipe: changing day would throw away what she has picked. */}
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
          onSettle={(dir, how) => {
            track(how === 'swipe' ? 'nav_swipe' : 'nav_arrow')
            goDay(addDays(date, dir))
          }}
          render={o => (
            <DayPanel
              date={addDays(date, o)}
              onOpen={id => void toggle(id)}
              selectedId={o === 0 && openEvent ? open?.id : null}
              panel={o === 0 ? (open?.panel ?? null) : null}
              onSlot={slot}
              editor={
                o === 0 &&
                open &&
                openEvent && (
                  <RowEditor
                    key={open.id}
                    date={date}
                    event={openEvent}
                    panel={open.panel}
                    onPanel={panel => setOpen(x => (x ? { ...x, panel } : x))}
                    onRemoved={() => setOpen(null)}
                  />
                )
              }
              onPickStay={() => setPickStay(true)}
              interactive={o === 0}
              onCompose={index => void addRow(index)}
              freshId={o === 0 ? fresh : null}
            />
          )}
        />
      </div>

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
