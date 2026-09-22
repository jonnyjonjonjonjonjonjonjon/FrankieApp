import type { DiaryEvent, Id, LibraryItem } from '../types'
import { EVENT_TYPES } from './symbols'

export interface EventFace {
  word: string
  symbol: string
  photoId: Id | null
  showPhoto: boolean
  /** The library item whose tile this is (for the photo flip), if any. */
  itemId: Id | null
}

/** What to show for an event: the activity, the first food, or the fixed type. */
export function eventFace(ev: DiaryEvent, items: Record<Id, LibraryItem>): EventFace {
  const type = EVENT_TYPES[ev.type]
  if (ev.type === 'activity' && ev.activityId && items[ev.activityId]) {
    const a = items[ev.activityId]
    return { word: a.name, symbol: a.symbol, photoId: a.photoId, showPhoto: a.showPhoto, itemId: a.id }
  }
  const food = ev.foodIds.map(id => items[id]).find(Boolean)
  if (food) {
    return { word: type.word, symbol: food.symbol, photoId: food.photoId, showPhoto: food.showPhoto, itemId: food.id }
  }
  return { word: type.word, symbol: type.symbol, photoId: null, showPhoto: false, itemId: null }
}

export const isMeal = (ev: DiaryEvent) => ev.type === 'breakfast' || ev.type === 'lunch' || ev.type === 'dinner'
