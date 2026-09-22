import type { LibraryItem, LibraryKind, MealSlot, PersonRole, PlaceType } from '../types'

/** Starting lists (PRD §4.11). Ids are stable so re-seeding never duplicates. */

interface SeedSpec {
  id: string
  kind: LibraryKind
  name: string
  symbol: string
  role?: PersonRole
  placeType?: PlaceType
  stayable?: boolean
  meals?: MealSlot[]
}

export const HOME_PLACE_ID = 'seed-place-my-house'

const SEED: SeedSpec[] = [
  // People
  { id: 'seed-person-mum', kind: 'person', name: 'Mum', symbol: '👩', role: 'family' },
  { id: 'seed-person-dad', kind: 'person', name: 'Dad', symbol: '👨', role: 'family' },
  { id: 'seed-person-liz', kind: 'person', name: 'Liz', symbol: '👩', role: 'family' },
  { id: 'seed-person-ria', kind: 'person', name: 'Ria', symbol: '👩', role: 'family' },
  { id: 'seed-person-jon', kind: 'person', name: 'Jon', symbol: '👨', role: 'family' },
  { id: 'seed-person-tara', kind: 'person', name: 'Tara', symbol: '🧑‍⚕️', role: 'carer' },

  // Places
  { id: HOME_PLACE_ID, kind: 'place', name: 'Rochester Road', symbol: '🏠', placeType: 'home', stayable: true },
  { id: 'seed-place-mum-dad', kind: 'place', name: 'Eastbourne', symbol: '🏡', placeType: 'home', stayable: true },
  { id: 'seed-place-jon', kind: 'place', name: "Jon's house", symbol: '🏠', placeType: 'friend', stayable: true },
  { id: 'seed-place-hotel', kind: 'place', name: 'Hotel', symbol: '🏨', placeType: 'accommodation', stayable: true },
  { id: 'seed-place-liz', kind: 'place', name: "Liz's house", symbol: '🏠', placeType: 'friend' },
  { id: 'seed-place-ria', kind: 'place', name: "Ria's house", symbol: '🏠', placeType: 'friend' },
  { id: 'seed-place-supermarket', kind: 'place', name: 'Supermarket', symbol: '🛒', placeType: 'shop' },
  { id: 'seed-place-clothes-shop', kind: 'place', name: 'Clothes shop', symbol: '👗', placeType: 'shop' },
  { id: 'seed-place-pool', kind: 'place', name: 'Swimming pool', symbol: '🏊', placeType: 'pool' },
  { id: 'seed-place-park', kind: 'place', name: 'Park', symbol: '🌳', placeType: 'other' },
  { id: 'seed-place-cafe', kind: 'place', name: 'Café', symbol: '☕', placeType: 'other' },
  { id: 'seed-place-hairdresser', kind: 'place', name: 'Hairdresser', symbol: '💇', placeType: 'other' },
  { id: 'seed-place-nails', kind: 'place', name: 'Nail salon', symbol: '💅', placeType: 'other' },
  { id: 'seed-place-doctor', kind: 'place', name: 'Doctor', symbol: '🩺', placeType: 'medical' },
  { id: 'seed-place-dentist', kind: 'place', name: 'Dentist', symbol: '🦷', placeType: 'medical' },

  // Foods
  { id: 'seed-food-toast', kind: 'food', name: 'Toast', symbol: '🍞', meals: ['breakfast'] },
  { id: 'seed-food-cereal', kind: 'food', name: 'Cereal', symbol: '🥣', meals: ['breakfast'] },
  { id: 'seed-food-porridge', kind: 'food', name: 'Porridge', symbol: '🥣', meals: ['breakfast'] },
  { id: 'seed-food-eggs', kind: 'food', name: 'Eggs', symbol: '🍳', meals: ['breakfast'] },
  { id: 'seed-food-sandwich', kind: 'food', name: 'Sandwich', symbol: '🥪', meals: ['lunch'] },
  { id: 'seed-food-soup', kind: 'food', name: 'Soup', symbol: '🍲', meals: ['lunch'] },
  { id: 'seed-food-jacket', kind: 'food', name: 'Jacket potato', symbol: '🥔', meals: ['lunch'] },
  { id: 'seed-food-beans', kind: 'food', name: 'Beans on toast', symbol: '🫘', meals: ['lunch'] },
  { id: 'seed-food-pasta', kind: 'food', name: 'Pasta', symbol: '🍝', meals: ['dinner'] },
  { id: 'seed-food-pizza', kind: 'food', name: 'Pizza', symbol: '🍕', meals: ['dinner'] },
  { id: 'seed-food-fish-chips', kind: 'food', name: 'Fish and chips', symbol: '🐟', meals: ['dinner'] },
  { id: 'seed-food-roast', kind: 'food', name: 'Roast dinner', symbol: '🍗', meals: ['dinner'] },
  { id: 'seed-food-curry', kind: 'food', name: 'Curry', symbol: '🍛', meals: ['dinner'] },
  { id: 'seed-food-sausages', kind: 'food', name: 'Sausages and mash', symbol: '🌭', meals: ['dinner'] },
  { id: 'seed-food-cake', kind: 'food', name: 'Cake', symbol: '🍰', meals: ['treat'] },
  { id: 'seed-food-ice-cream', kind: 'food', name: 'Ice cream', symbol: '🍦', meals: ['treat'] },
  { id: 'seed-food-biscuits', kind: 'food', name: 'Biscuits', symbol: '🍪', meals: ['treat'] },
  { id: 'seed-food-chocolate', kind: 'food', name: 'Chocolate', symbol: '🍫', meals: ['treat'] },
  { id: 'seed-food-tea', kind: 'food', name: 'Tea', symbol: '🍵', meals: ['drink'] },
  { id: 'seed-food-juice', kind: 'food', name: 'Juice', symbol: '🧃', meals: ['drink'] },
  { id: 'seed-food-water', kind: 'food', name: 'Water', symbol: '💧', meals: ['drink'] },

  // Activities
  { id: 'seed-activity-food-shopping', kind: 'activity', name: 'Food shopping', symbol: '🛒' },
  { id: 'seed-activity-clothes-shopping', kind: 'activity', name: 'Clothes shopping', symbol: '👗' },
  { id: 'seed-activity-walk', kind: 'activity', name: 'Walk', symbol: '🚶' },
  { id: 'seed-activity-swimming', kind: 'activity', name: 'Swimming', symbol: '🏊' },
  { id: 'seed-activity-computer', kind: 'activity', name: 'Computer', symbol: '💻' },
  { id: 'seed-activity-sleeping', kind: 'activity', name: 'Sleeping', symbol: '😴' },
  { id: 'seed-activity-friends', kind: 'activity', name: 'Seeing friends', symbol: '👫' },
]

export function seedItems(now = new Date().toISOString()): LibraryItem[] {
  return SEED.map((s, i) => ({
    id: s.id,
    kind: s.kind,
    name: s.name,
    symbol: s.symbol,
    photoId: null,
    showPhoto: false,
    order: i,
    role: s.role,
    birthday: s.kind === 'person' ? null : undefined,
    placeType: s.placeType,
    stayable: s.stayable,
    meals: s.meals,
    seeded: true,
    deleted: false,
    createdAt: now,
    updatedAt: now,
  }))
}
