import type { PointerEvent } from 'react'
import { Clock, GripVertical } from 'lucide-react'
import { eventFace, isMeal } from '../../lib/eventFace'
import { useStore } from '../../lib/store'
import { RATING_FACES } from '../../lib/symbols'
import type { DiaryEvent } from '../../types'
import { Photo } from '../ui/Photo'
import { Symbol } from '../ui/Symbol'
import { TimeLabel } from '../ui/TimeLabel'

interface Props {
  event: DiaryEvent
  onOpen: () => void
  onTime: () => void
  /** Pointer-down on the grip starts a drag (handled by the list). */
  onGrip?: (e: PointerEvent<HTMLButtonElement>) => void
  dragging?: boolean
  /** Where today has got to: orange edge and tint. */
  current?: boolean
}

/** One row of the day: symbol (tap for photo), word, time or a clock to add one, place, who, grip to reorder. */
export function EventRow({ event, onOpen, onTime, onGrip, dragging, current }: Props) {
  const store = useStore()
  const { items } = store.state
  const face = eventFace(event, items)
  const foods = event.foodIds.map(id => items[id]).filter(Boolean)
  const place = event.placeId ? items[event.placeId] : null
  const people = event.personIds.map(id => items[id]).filter(Boolean)
  const showPhoto = face.photoId && face.showPhoto

  return (
    <div
      className={`flex items-stretch gap-3 rounded-3xl border-4 p-1.5 ${
        current ? 'border-orange bg-orange-light' : 'border-ink bg-paper'
      } ${dragging ? 'scale-[1.02] shadow-2xl ring-4 ring-orange-light' : ''}`}
      aria-current={current ? 'time' : undefined}
    >
      <button
        type="button"
        aria-label={face.photoId ? 'Show photo' : face.word}
        onClick={() => (face.itemId && face.photoId ? store.toggleItemPhoto(face.itemId) : onOpen())}
        className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-soft active:scale-95"
      >
        {showPhoto && face.photoId ? (
          <Photo id={face.photoId} alt={face.word} className="h-full w-full" />
        ) : (
          <Symbol symbol={face.symbol} size="text-6xl" />
        )}
      </button>

      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 flex-col justify-center gap-1 text-left">
        <span className="line-clamp-2 text-3xl font-extrabold leading-tight">
          {face.word}
          {event.rating && (
            <span className="symbol ml-2" aria-label={RATING_FACES[event.rating].word}>
              {RATING_FACES[event.rating].symbol}
            </span>
          )}
        </span>
        {event.time && <TimeLabel time={event.time} />}
        {(foods.length > 0 || place || people.length > 0) && (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xl font-bold text-ink-soft">
            {isMeal(event) &&
              foods.map(f => (
                <span key={f.id} className="inline-flex items-center gap-1">
                  <Symbol symbol={f.symbol} size="text-3xl" /> {f.name}
                </span>
              ))}
            {place && (
              <span className="inline-flex items-center gap-1">
                <Symbol symbol={place.symbol} size="text-3xl" /> {place.name}
              </span>
            )}
            {people.map(p => (
              <span key={p.id} className="inline-flex items-center gap-1">
                <Symbol symbol={p.symbol} size="text-3xl" /> {p.name}
              </span>
            ))}
          </span>
        )}
      </button>

      <div className="flex shrink-0 flex-col items-center justify-between gap-1">
        <button
          type="button"
          onClick={onTime}
          aria-label={event.time ? 'Change time' : 'Add a time'}
          className={`flex h-11 w-11 items-center justify-center rounded-xl border-2 active:scale-95 ${
            event.time ? 'border-line text-ink-soft' : 'border-ink text-ink'
          }`}
        >
          <Clock size={26} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          aria-label="Move"
          onPointerDown={onGrip}
          data-noswipe
          className="flex flex-1 cursor-grab touch-none items-center justify-center rounded-xl text-ink-soft active:cursor-grabbing"
        >
          <GripVertical size={34} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
