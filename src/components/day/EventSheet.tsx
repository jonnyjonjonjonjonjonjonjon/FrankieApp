import { useState, type ReactNode } from 'react'
import { ChevronRight, Trash2 } from 'lucide-react'
import { eventFace, isMeal } from '../../lib/eventFace'
import { useStore } from '../../lib/store'
import { eventTypeInfo } from '../../lib/symbols'
import type { DiaryEvent, Id, MealSlot } from '../../types'
import { BigButton } from '../ui/BigButton'
import { Photo } from '../ui/Photo'
import { Sheet } from '../ui/Sheet'
import { Symbol } from '../ui/Symbol'
import { TimeLabel } from '../ui/TimeLabel'
import { ItemPicker } from '../pickers/ItemPicker'
import { RatingPicker } from '../pickers/RatingPicker'
import { TimePicker } from '../pickers/TimePicker'

interface Props {
  eventId: Id
  date: string
  onClose: () => void
}

type Sub = null | 'time' | 'food' | 'activity' | 'place' | 'people'

function Row({ symbol, word, value, onClick }: { symbol: string; word: string; value: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-24 w-full items-center gap-4 rounded-3xl border-4 border-ink bg-paper px-4 py-2 text-left active:bg-soft"
    >
      <Symbol symbol={symbol} size="text-5xl" />
      <span className="w-40 shrink-0 text-2xl font-extrabold">{word}</span>
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-2xl font-bold text-ink-soft">{value}</span>
      <ChevronRight size={40} strokeWidth={3} />
    </button>
  )
}

/** Tap an event to change it: when, food/activity, where, who, rating, remove. */
export function EventSheet({ eventId, date, onClose }: Props) {
  const store = useStore()
  const { items } = store.state
  const [sub, setSub] = useState<Sub>(null)

  // DayView materialises the day before opening, so this is always a stored event.
  const event: DiaryEvent | undefined = store.state.events[eventId]
  if (!event) return null

  const face = eventFace(event, items)
  const names = (ids: Id[]) =>
    ids
      .map(id => items[id])
      .filter(Boolean)
      .map(i => (
        <span key={i.id} className="inline-flex items-center gap-1">
          <Symbol symbol={i.symbol} size="text-4xl" /> {i.name}
        </span>
      ))
  const dash = <span className="text-line">—</span>
  const place = event.placeId ? items[event.placeId] : null
  const meal = isMeal(event)

  if (sub === 'time') {
    return (
      <TimePicker
        value={event.time ?? '10:00'}
        allowNone={Boolean(event.time)}
        onBack={() => setSub(null)}
        onDone={t => {
          void store.setEventTime(date, event.id, t)
          setSub(null)
        }}
      />
    )
  }
  if (sub === 'food') {
    return (
      <ItemPicker
        kind="food"
        title={eventTypeInfo(event.type).word}
        symbol={eventTypeInfo(event.type).symbol}
        multi
        initial={event.foodIds}
        mealSlot={event.type as MealSlot}
        onBack={() => setSub(null)}
        onDone={ids => {
          void store.updateEvent(date, event.id, { foodIds: ids })
          setSub(null)
        }}
      />
    )
  }
  if (sub === 'activity') {
    return (
      <ItemPicker
        kind="activity"
        title="Activity"
        onBack={() => setSub(null)}
        onDone={ids => {
          void store.updateEvent(date, event.id, { activityId: ids[0] ?? null })
          setSub(null)
        }}
      />
    )
  }
  if (sub === 'place') {
    return (
      <ItemPicker
        kind="place"
        title="Where?"
        allowNone
        onBack={() => setSub(null)}
        onDone={ids => {
          void store.updateEvent(date, event.id, { placeId: ids[0] ?? null })
          setSub(null)
        }}
      />
    )
  }
  if (sub === 'people') {
    return (
      <ItemPicker
        kind="person"
        title="Who?"
        multi
        initial={event.personIds}
        onBack={() => setSub(null)}
        onDone={ids => {
          void store.updateEvent(date, event.id, { personIds: ids })
          setSub(null)
        }}
      />
    )
  }

  return (
    <Sheet
      title={face.word}
      onBack={onClose}
      footer={
        <BigButton
          variant="danger"
          onClick={() => {
            void store.deleteEvent(date, event.id, face.word)
            onClose()
          }}
        >
          <Trash2 size={36} strokeWidth={2.5} />
          Remove
        </BigButton>
      }
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <div className="flex items-center gap-5 rounded-3xl border-4 border-line bg-soft p-4">
          <div className="flex h-36 w-36 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-paper">
            {face.photoId && face.showPhoto ? (
              <Photo id={face.photoId} alt={face.word} className="h-full w-full" />
            ) : (
              <Symbol symbol={face.symbol} size="text-8xl" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-4xl font-extrabold">{face.word}</span>
            {event.time && <TimeLabel time={event.time} size="lg" />}
          </div>
        </div>

        <Row symbol="🕒" word="When?" value={event.time ? <TimeLabel time={event.time} /> : dash} onClick={() => setSub('time')} />
        {meal && (
          <Row symbol="🍽️" word="Food" value={event.foodIds.length ? names(event.foodIds) : dash} onClick={() => setSub('food')} />
        )}
        {event.type === 'activity' && (
          <Row
            symbol="⭐"
            word="Activity"
            value={event.activityId ? names([event.activityId]) : dash}
            onClick={() => setSub('activity')}
          />
        )}
        <Row symbol="📍" word="Where?" value={place ? names([place.id]) : dash} onClick={() => setSub('place')} />
        <Row symbol="🧑" word="Who?" value={event.personIds.length ? names(event.personIds) : dash} onClick={() => setSub('people')} />

        <div className="flex flex-col gap-2 rounded-3xl border-4 border-line p-4">
          <span className="text-2xl font-extrabold">Did I like it?</span>
          <RatingPicker value={event.rating} onChange={r => void store.rateEvent(date, event.id, r)} />
        </div>
      </div>
    </Sheet>
  )
}
