import { ArrowRight } from 'lucide-react'
import { eventFace, isMeal, travelDestination } from '../../lib/eventFace'
import { useStore } from '../../lib/store'
import { RATING_FACES } from '../../lib/symbols'
import type { DiaryEvent } from '../../types'
import { Photo } from '../ui/Photo'
import { Symbol } from '../ui/Symbol'
import { TimeLabel } from '../ui/TimeLabel'

interface Props {
  event: DiaryEvent
  onOpen: () => void
  dragging?: boolean
  /** Being pressed (a hold may lift it): the border turns orange. */
  pressing?: boolean
  /** Where today has got to: orange edge and tint. */
  current?: boolean
}

/**
 * One row of the day, kept plain (owner, Sept 2026): symbol (tap for photo), then the word and its
 * time, then what goes with it (foods, place, people) as pictures with their names across the rest
 * of the row, dropping under the word where the row is too narrow. Tap it to open it (its time is set
 * there, under When?); hold it to drag it.
 */
export function EventRow({ event, onOpen, dragging, pressing, current }: Props) {
  const store = useStore()
  const { items } = store.state
  const face = eventFace(event, items)
  const foods = event.foodIds.map(id => items[id]).filter(Boolean)
  // Travel shows its destination on the title line ("Bus ➜ Swimming pool"), not in the line below.
  const destination = travelDestination(event, items)
  const place = event.type !== 'travel' && event.placeId ? items[event.placeId] : null
  const people = event.personIds.map(id => items[id]).filter(Boolean)
  const showPhoto = face.photoId && face.showPhoto
  // What goes with it, as pictures on the right: the meal's foods, where, who.
  const extras = [...(isMeal(event) ? foods : []), ...(place ? [place] : []), ...people]

  return (
    <div
      // A light card on the day's timeline (the line and dots join the rows into one list).
      className={`flex items-stretch gap-3 rounded-2xl border-[3px] p-1.5 ${
        pressing || dragging
          ? current
            ? 'border-orange-dark bg-orange-light'
            : 'border-orange bg-paper'
          : current
            ? 'border-orange bg-orange-light'
            : 'border-line bg-paper'
      } ${dragging ? 'scale-[1.02] shadow-2xl ring-4 ring-orange-light' : ''}`}
      aria-current={current ? 'time' : undefined}
    >
      <button
        type="button"
        aria-label={face.photoId ? 'Show photo' : face.word}
        onClick={() => (face.itemId && face.photoId ? store.toggleItemPhoto(face.itemId) : onOpen())}
        className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl active:scale-95"
      >
        {showPhoto && face.photoId ? (
          <Photo id={face.photoId} alt={face.word} className="h-full w-full" />
        ) : (
          <Symbol symbol={face.symbol} size="text-6xl" />
        )}
      </button>

      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 py-1 pr-2 text-left">
        <span className="flex min-w-[10rem] flex-1 flex-col justify-center gap-1">
          {destination ? (
            // One line where it fits; on a phone "➜ place" drops under the word and a long place name
            // wraps between its words beside the arrow. Where even its longest word will not fit beside
            // the arrow (basis = min-content), the name drops under the arrow: never split mid-word, never past the row.
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 text-3xl leading-tight" data-travel-line>
              <span className="font-extrabold">{face.word}</span>
              <span className="flex min-w-0 max-w-full flex-wrap items-center gap-x-2">
                <ArrowRight size={36} strokeWidth={3} aria-label="to" className="shrink-0" />
                <Symbol symbol={destination.symbol} size="text-3xl" />
                <span className="min-w-0 grow basis-[min-content] break-words font-bold">{destination.name}</span>
              </span>
              {event.rating && (
                <span className="inline-flex" aria-label={RATING_FACES[event.rating].word}>
                  <Symbol symbol={RATING_FACES[event.rating].symbol} size="text-3xl" />
                </span>
              )}
            </span>
          ) : (
            <span className="line-clamp-2 text-3xl font-extrabold leading-tight">
              {face.word}
              {event.rating && (
                <span className="ml-2 inline-flex align-middle" aria-label={RATING_FACES[event.rating].word}>
                  <Symbol symbol={RATING_FACES[event.rating].symbol} size="text-3xl" />
                </span>
              )}
            </span>
          )}
          {event.time && <TimeLabel time={event.time} />}
        </span>
        {extras.length > 0 && (
          <span className="ml-auto flex flex-wrap justify-end gap-x-3 gap-y-2">
            {extras.map(x => (
              <span key={x.id} className="flex w-24 flex-col items-center gap-1">
                {/* A person's (or place's) own photo when it is set to show, as on their tile. */}
                {x.photoId && x.showPhoto ? (
                  <Photo id={x.photoId} alt="" className="h-16 w-16 rounded-xl" />
                ) : (
                  <Symbol symbol={x.symbol} size="text-5xl" />
                )}
                <span className="text-center text-lg font-bold leading-tight text-ink-soft">{x.name}</span>
              </span>
            ))}
          </span>
        )}
      </button>

    </div>
  )
}
