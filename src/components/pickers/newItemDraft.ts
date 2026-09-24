import { SHELF_MEAL } from '../../lib/categories'
import type { store as storeInstance } from '../../lib/store'
import type { Idea } from '../../lib/ideas'
import { track } from '../../lib/usage'
import type { LibraryItem, LibraryKind, MealSlot, PhotoCredit } from '../../types'

/** A new word being made (NewItemFields), until Yes saves it. */
export interface NewItemDraft {
  name: string
  /** Shelf, for kinds that have them. */
  category: string | null
  symbol: string
  /** A photo from the camera, gallery or web; shrunk when saved. */
  photo: Blob | null
  /** Where a web photo came from (null for the camera or gallery). */
  photoCredit: PhotoCredit | null
}

export const newDraft = (category: string | null): NewItemDraft => ({ name: '', category, symbol: '', photo: null, photoCredit: null })

/** A word and a picture (symbol or photo) are both needed. */
export const draftReady = (d: NewItemDraft) => d.name.trim().length > 0 && Boolean(d.symbol || d.photo)

/**
 * Save a draft as a new word. Foods also get the old meal tag for their shelf
 * (or the meal they were made from), so older copies still sort their pickers.
 */
export function saveDraft(
  store: Pick<typeof storeInstance, 'addItem'>,
  kind: LibraryKind,
  d: NewItemDraft,
  { mealSlot, extra }: { mealSlot?: MealSlot; extra?: Partial<LibraryItem> } = {},
): Promise<LibraryItem> {
  const meal = kind === 'food' ? (d.category && SHELF_MEAL[d.category]) || mealSlot : undefined
  const web = Boolean(d.photo && d.photoCredit)
  track('word_new')
  if (web) track('word_web')
  return store.addItem(kind, d.name, d.symbol, d.photo, {
    ...(d.category ? { category: d.category } : {}),
    ...(meal ? { meals: [meal] } : {}),
    ...(web ? { photoCredit: d.photoCredit } : {}),
    ...extra,
  })
}

/** Save a Try idea as a new word on its shelf (foods also get the old meal tag, as new words do). */
export async function addIdea(store: Pick<typeof storeInstance, 'addItem' | 'toast'>, idea: Idea, mealSlot?: MealSlot): Promise<LibraryItem> {
  track('try_add')
  const meal = idea.kind === 'food' ? SHELF_MEAL[idea.category] || mealSlot : undefined
  const item = await store.addItem(idea.kind, idea.name, idea.symbol, null, { category: idea.category, ...(meal ? { meals: [meal] } : {}) })
  store.toast(`${item.name} added`)
  return item
}
