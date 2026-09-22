import { Check } from 'lucide-react'
import { eventFace, isMeal } from '../../lib/eventFace'
import { buzz } from '../../lib/haptics'
import { useStore } from '../../lib/store'
import { RATING_FACES } from '../../lib/symbols'
import type { DiaryEvent } from '../../types'
import { Photo } from '../ui/Photo'
import { Symbol } from '../ui/Symbol'
import { TimeLabel } from '../ui/TimeLabel'

interface Props {
  event: DiaryEvent
  onOpen: () => void
}

/** One row of the day: symbol (tap for photo), word, time, place, who, big tick box. */
export function EventRow({ event, onOpen }: Props) {
  const store = useStore()
  const { items } = store.state
  const face = eventFace(event, items)
  const foods = event.foodIds.map(id => items[id]).filter(Boolean)
  const place = event.placeId ? items[event.placeId] : null
  const people = event.personIds.map(id => items[id]).filter(Boolean)
  const showPhoto = face.photoId && face.showPhoto

  const tick = () => {
    buzz(event.done ? 20 : [40, 40, 60])
    void store.toggleDone(event.date, event.id)
  }

  return (
    <div
      className={`flex items-stretch gap-3 rounded-3xl border-4 bg-paper p-1.5 transition-opacity ${
        event.done ? 'border-line opacity-60' : 'border-ink'
      }`}
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
        <span className={`line-clamp-2 text-3xl font-extrabold leading-tight ${event.done ? 'line-through decoration-4' : ''}`}>
          {face.word}
          {event.rating && (
            <span className="symbol ml-2 no-underline" aria-label={RATING_FACES[event.rating].word}>
              {RATING_FACES[event.rating].symbol}
            </span>
          )}
        </span>
        <TimeLabel time={event.time} />
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

      <button
        type="button"
        role="checkbox"
        aria-checked={event.done}
        aria-label="Done"
        onClick={tick}
        className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-4 active:scale-95 ${
          event.done ? 'border-green bg-green text-white' : 'border-ink bg-paper'
        }`}
      >
        {event.done && <Check size={72} strokeWidth={4} className="tick-pop" />}
      </button>
    </div>
  )
}
