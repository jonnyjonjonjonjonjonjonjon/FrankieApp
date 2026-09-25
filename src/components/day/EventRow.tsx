import { ArrowRight, Clock } from 'lucide-react'
import { eventFace, isMeal, travelDestination } from '../../lib/eventFace'
import { useStore } from '../../lib/store'
import type { DiaryEvent, LibraryItem } from '../../types'
import { Photo } from '../ui/Photo'
import { Symbol } from '../ui/Symbol'
import { TimeLabel } from '../ui/TimeLabel'
import { FOOD_SYMBOL, WHAT_SYMBOL, WHERE_SYMBOL, WHO_SYMBOL, type Slot } from './RowEditor'
import { WHERE_TO_SYMBOL } from '../../lib/symbols'

interface Props {
  event: DiaryEvent
  /** Tap the row (not a slot): opens it, or closes it again. */
  onOpen: () => void
  dragging?: boolean
  /** Being pressed (a hold may lift it): the border turns orange. */
  pressing?: boolean
  /** Where today has got to: orange edge and tint. */
  current?: boolean
  /** Open: its empty slots show, and each part can be tapped to set it. */
  selected?: boolean
  /** The part whose choices are open under the row. */
  panel?: Slot | null
  onSlot?: (slot: Slot) => void
}

/**
 * One row of the day, kept plain (owner, Sept 2026): symbol (tap for photo), then the word and its
 * time, then what goes with it (foods, place, people) as pictures with their names across the rest
 * of the row, dropping under the word where the row is too narrow. Tap it to open it: it shows
 * dashed empty slots for what isn't set yet (a clock, What?, Where?, Who?), and tapping any part
 * opens its choices under the row (RowEditor). Hold it to drag it.
 */
export function EventRow({ event, onOpen, dragging, pressing, current, selected = false, panel = null, onSlot }: Props) {
  const store = useStore()
  const { items } = store.state
  const face = eventFace(event, items)
  const foods = event.foodIds.map(id => items[id]).filter(Boolean)
  // Travel shows its destination on the title line ("Bus ➜ Swimming pool"), not in the line below.
  const destination = travelDestination(event, items)
  const travel = event.type === 'travel'
  const place = !travel && event.placeId ? items[event.placeId] : null
  const people = event.personIds.map(id => items[id]).filter(Boolean)
  const showPhoto = face.photoId && face.showPhoto
  const meal = isMeal(event)
  // A new row (from a +) is an activity with nothing chosen yet: What? takes the picture's place.
  const noWhat = event.type === 'activity' && !event.activityId
  const word = noWhat ? 'What?' : face.word
  // What goes with it, as pictures on the right: the meal's foods, where, who.
  const extras = [...(meal ? foods : []), ...(place ? [place] : []), ...people]

  const wordLine = (
    <>
      {destination ? (
        // One line where it fits; on a phone "➜ place" drops under the word and a long place name
        // wraps between its words beside the arrow. Where even its longest word will not fit beside
        // the arrow (basis = min-content), the name drops under the arrow: never split mid-word, never past the row.
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 text-3xl leading-tight" data-travel-line>
          <span className="font-extrabold">{word}</span>
          <span className="flex min-w-0 max-w-full flex-wrap items-center gap-x-2">
            <ArrowRight size={36} strokeWidth={3} aria-label="to" className="shrink-0" />
            <Symbol symbol={destination.symbol} size="text-3xl" />
            <span className="min-w-0 grow basis-[min-content] break-words font-bold">{destination.name}</span>
          </span>
        </span>
      ) : (
        <span className={`line-clamp-2 text-3xl font-extrabold leading-tight ${noWhat ? 'text-orange-dark' : ''}`}>
          {word}
        </span>
      )}
    </>
  )

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
            : selected
              ? 'border-orange bg-paper'
              : 'border-line bg-paper'
      } ${dragging ? 'scale-[1.02] shadow-2xl ring-4 ring-orange-light' : ''}`}
      aria-current={current ? 'time' : undefined}
    >
      {noWhat ? (
        <button
          type="button"
          aria-label="What?"
          onClick={() => (selected && onSlot ? onSlot('what') : onOpen())}
          className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-[3px] border-dashed active:scale-95 ${
            panel === 'what' ? 'border-orange bg-orange-light' : 'border-orange/70'
          }`}
        >
          <span className="opacity-50">
            <Symbol symbol={WHAT_SYMBOL} size="text-5xl" />
          </span>
        </button>
      ) : (
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
      )}

      {selected && onSlot ? (
        // Open: the word closes it again (a new row's What? opens its choices); the time and every picture (or its empty slot) set that part.
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 py-1 pr-2">
          <span className="flex min-w-[10rem] flex-1 flex-col items-start justify-center gap-1">
            <button type="button" onClick={noWhat ? () => onSlot('what') : onOpen} aria-expanded className="text-left">
              {wordLine}
            </button>
            {event.time ? (
              <button type="button" onClick={() => onSlot('time')} aria-label="Change time" className={`rounded-xl px-1 ${panel === 'time' ? 'bg-orange-light ring-4 ring-orange' : ''}`}>
                <TimeLabel time={event.time} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSlot('time')}
                aria-label="Add a time"
                className={`inline-flex items-center rounded-full border-[3px] border-dashed px-3 py-0.5 text-orange-dark ${panel === 'time' ? 'border-orange bg-orange-light' : 'border-orange/70'}`}
              >
                <Clock size={30} strokeWidth={2.5} />
              </button>
            )}
          </span>
          <span className="ml-auto flex flex-wrap justify-end gap-x-3 gap-y-2">
            {meal && (foods.length ? <Filled items={foods} on={panel === 'food'} onClick={() => onSlot('food')} /> : <Empty symbol={FOOD_SYMBOL} word="What?" on={panel === 'food'} onClick={() => onSlot('food')} />)}
            {travel ? (
              destination ? (
                <Filled items={[{ id: 'to', name: destination.name, symbol: destination.symbol, photoId: null, showPhoto: false }]} on={panel === 'where'} onClick={() => onSlot('where')} />
              ) : (
                <Empty symbol={WHERE_TO_SYMBOL} word="Where to?" on={panel === 'where'} onClick={() => onSlot('where')} />
              )
            ) : place ? (
              <Filled items={[place]} on={panel === 'where'} onClick={() => onSlot('where')} />
            ) : (
              <Empty symbol={WHERE_SYMBOL} word="Where?" on={panel === 'where'} onClick={() => onSlot('where')} />
            )}
            {people.length ? <Filled items={people} on={panel === 'who'} onClick={() => onSlot('who')} /> : <Empty symbol={WHO_SYMBOL} word="Who?" on={panel === 'who'} onClick={() => onSlot('who')} />}
          </span>
        </div>
      ) : (
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 py-1 pr-2 text-left">
          <span className="flex min-w-[10rem] flex-1 flex-col justify-center gap-1">
            {wordLine}
            {event.time && <TimeLabel time={event.time} />}
          </span>
          {extras.length > 0 && (
            <span className="ml-auto flex flex-wrap justify-end gap-x-3 gap-y-2">
              {extras.map(x => (
                <Picture key={x.id} item={x} />
              ))}
            </span>
          )}
        </button>
      )}
    </div>
  )
}

type Pictured = Pick<LibraryItem, 'id' | 'name' | 'symbol' | 'photoId' | 'showPhoto'>

/** A food, place or person on the row: its picture (or own photo, when set to show) and name. */
function Picture({ item }: { item: Pictured }) {
  return (
    <span className="flex w-24 flex-col items-center gap-1">
      {item.photoId && item.showPhoto ? <Photo id={item.photoId} alt="" className="h-16 w-16 rounded-xl" /> : <Symbol symbol={item.symbol} size="text-5xl" />}
      <span className="text-center text-lg font-bold leading-tight text-ink-soft">{item.name}</span>
    </span>
  )
}

/** What is set, on an open row: tap to change it. */
function Filled({ items, on, onClick }: { items: Pictured[]; on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`flex flex-wrap justify-end gap-x-3 gap-y-2 rounded-2xl p-1 ${on ? 'bg-orange-light ring-4 ring-orange' : ''}`}>
      {items.map(x => (
        <Picture key={x.id} item={x} />
      ))}
    </button>
  )
}

/** An empty slot on an open row: a faded picture in a dashed box, and its question. */
function Empty({ symbol, word, on, onClick }: { symbol: string; word: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-24 flex-col items-center gap-1">
      <span className={`flex h-16 w-16 items-center justify-center rounded-xl border-[3px] border-dashed ${on ? 'border-orange bg-orange-light' : 'border-orange/70'}`}>
        <span className="opacity-50">
          <Symbol symbol={symbol} size="text-4xl" />
        </span>
      </span>
      <span className="text-center text-lg font-bold leading-tight text-orange-dark">{word}</span>
    </button>
  )
}
