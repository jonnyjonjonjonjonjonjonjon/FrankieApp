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

/** What to show for an event: the activity or travel mode, or the fixed type (meals always show Eat; their food shows beside it). */
export function eventFace(ev: DiaryEvent, items: Record<Id, LibraryItem>): EventFace {
  const type = eventTypeInfo(ev.type)
  const chosen = ev.type === 'activity' ? ev.activityId : ev.type === 'travel' ? ev.travelId : null
  if (chosen && items[chosen]) {
    const a = items[chosen]
    return { word: a.name, symbol: a.symbol, photoId: a.photoId, showPhoto: a.showPhoto, itemId: a.id }
  }
  return { word: type.word, symbol: type.symbol, photoId: null, showPhoto: false, itemId: null }
}

/** A travel event's destination (its place), if it still exists. */
export function travelDestination(ev: DiaryEvent, items: Record<Id, LibraryItem>): LibraryItem | null {
  return ev.type === 'travel' && ev.placeId ? items[ev.placeId] ?? null : null
}

/**
 * A row with nothing in it: an activity with no What?, Where? or Who? (a time alone doesn't count).
 * It disappears once she moves on to anything else (owner, Sept 2026).
 */
export const isEmptyRow = (ev: DiaryEvent) => ev.type === 'activity' && !ev.activityId && !ev.placeId && ev.personIds.length === 0

export const isMeal = (ev: DiaryEvent) => ev.type === 'breakfast' || ev.type === 'lunch' || ev.type === 'dinner'
