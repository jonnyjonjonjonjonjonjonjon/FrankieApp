import type { DiaryEvent, Id, LibraryItem } from '../types'
import { eventTypeInfo } from './symbols'

export interface EventFace {
  word: string
  symbol: string
  photoId: Id | null
  showPhoto: boolean
  /** The library item whose tile this is (for the photo flip), if any. */
  itemId: Id | null
}

/** What to show for an event: the activity or travel mode, the first food, or the fixed type. */
export function eventFace(ev: DiaryEvent, items: Record<Id, LibraryItem>): EventFace {
  const type = eventTypeInfo(ev.type)
  const chosen = ev.type === 'activity' ? ev.activityId : ev.type === 'travel' ? ev.travelId : null
  if (chosen && items[chosen]) {
    const a = items[chosen]
    return { word: a.name, symbol: a.symbol, photoId: a.photoId, showPhoto: a.showPhoto, itemId: a.id }
  }
  const food = ev.foodIds.map(id => items[id]).find(Boolean)
  if (food) {
    return { word: type.word, symbol: food.symbol, photoId: food.photoId, showPhoto: food.showPhoto, itemId: food.id }
  }
  return { word: type.word, symbol: type.symbol, photoId: null, showPhoto: false, itemId: null }
}

/** A travel event's destination (its place), if it still exists. */
export function travelDestination(ev: DiaryEvent, items: Record<Id, LibraryItem>): LibraryItem | null {
  return ev.type === 'travel' && ev.placeId ? items[ev.placeId] ?? null : null
}

export const isMeal = (ev: DiaryEvent) => ev.type === 'breakfast' || ev.type === 'lunch' || ev.type === 'dinner'
