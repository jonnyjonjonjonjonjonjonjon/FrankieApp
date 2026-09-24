import { SHELF_MEAL } from '../../lib/categories'
import type { store as storeInstance } from '../../lib/store'
import type { LibraryItem, LibraryKind, MealSlot } from '../../types'

/** A new word being made (NewItemFields), until Yes saves it. */
export interface NewItemDraft {
  name: string
  /** Shelf, for kinds that have them. */
  category: string | null
  symbol: string
  /** A photo from the camera or gallery; shrunk when saved. */
  photo: Blob | null
}

export const newDraft = (category: string | null): NewItemDraft => ({ name: '', category, symbol: '', photo: null })

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
  return store.addItem(kind, d.name, d.symbol, d.photo, {
    ...(d.category ? { category: d.category } : {}),
    ...(meal ? { meals: [meal] } : {}),
    ...extra,
  })
}
