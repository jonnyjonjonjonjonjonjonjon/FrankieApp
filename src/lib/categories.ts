import type { LibraryItem, LibraryKind, MealSlot } from '../types'
import { SEED_CATEGORY } from './seed'
import { EAT_SYMBOL } from './symbols'

/**
 * Shelves within a kind (backlog item 3): people by who they are to her, food
 * by meal (the way Frankie thinks of her day), activities by what kind of
 * thing they are. Places and travel are short lists and have none.
 *
 * An item's `category` is only written when the family saves a word; older
 * records and unedited seeds are placed by categoryOf() at read time, so no
 * migration rewrites the diary (backlog plan §2.1 rule 5).
 */

export interface Category {
  id: string
  word: string
  symbol: string
}

export const CATEGORIES: Partial<Record<LibraryKind, Category[]>> = {
  person: [
    { id: 'family', word: 'Family', symbol: 'mb:family' },
    { id: 'staff', word: 'Staff', symbol: 'mb:care_assistant_1a' },
    { id: 'friends', word: 'Friends', symbol: 'mb:hug-to' },
  ],
  food: [
    // Mealtime shelves show Eat, not a food (owner, Sept 2026).
    { id: 'breakfast', word: 'Breakfast', symbol: EAT_SYMBOL },
    { id: 'lunch', word: 'Lunch', symbol: EAT_SYMBOL },
    { id: 'dinner', word: 'Dinner', symbol: EAT_SYMBOL },
    { id: 'fruit', word: 'Fruit', symbol: 'mb:fruit' },
    { id: 'treats', word: 'Treats', symbol: 'mb:sweet' },
    { id: 'drinks', word: 'Drinks', symbol: 'mb:drink' },
  ],
  activity: [
    { id: 'home', word: 'Home', symbol: 'mb:house' },
    { id: 'out', word: 'Out', symbol: 'mb:go_outside-to' },
    { id: 'active', word: 'Active', symbol: 'mb:exercise-to' },
    { id: 'fun', word: 'Fun', symbol: 'mb:party_celebration' },
    { id: 'friends', word: 'Friends', symbol: 'mb:meet-to' },
    { id: 'relax', word: 'Relax', symbol: 'mb:relax-to' },
  ],
}

/** Old meal tags → food shelf (for foods saved before categories). */
const MEAL_SHELF: Record<MealSlot, string> = {
  breakfast: 'breakfast',
  lunch: 'lunch',
  dinner: 'dinner',
  treat: 'treats',
  drink: 'drinks',
}

/** Food shelf → the old meal tag, written alongside so older copies still sort their meal pickers. */
export const SHELF_MEAL: Record<string, MealSlot> = {
  breakfast: 'breakfast',
  lunch: 'lunch',
  dinner: 'dinner',
  treats: 'treat',
  drinks: 'drink',
}

export function categoriesFor(kind: LibraryKind): Category[] {
  return CATEGORIES[kind] ?? []
}

export function categoryInfo(kind: LibraryKind, id: string | null): Category | null {
  return categoriesFor(kind).find(c => c.id === id) ?? null
}

/** The shelf a new word goes on when nothing else is chosen. */
export function defaultCategory(kind: LibraryKind): string | null {
  return categoriesFor(kind)[0]?.id ?? null
}

/** The item's shelf, or a sensible one for records written by older versions. null for kinds without shelves. */
export function categoryOf(item: LibraryItem): string | null {
  const list = CATEGORIES[item.kind]
  if (!list) return null
  const known = (id: string | undefined) => (id && list.some(c => c.id === id) ? id : null)
  const stored = known(item.category) ?? known(SEED_CATEGORY[item.id])
  if (stored) return stored
  switch (item.kind) {
    case 'person':
      return item.role === 'carer' ? 'staff' : item.role === 'family' ? 'family' : 'friends'
    case 'food': {
      const meal = item.meals?.[0]
      return meal ? MEAL_SHELF[meal] ?? 'dinner' : 'dinner'
    }
    default:
      return list[0].id
  }
}
