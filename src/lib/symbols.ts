import type { EventType, LibraryKind } from '../types'

/**
 * Fixed event types (PRD §4.11). Symbols are drawn from Mulberry, falling back
 * to OpenMoji (see symbolImages.ts); emoji here are looked up, "mb:" names are direct.
 */
export const EVENT_TYPES: Record<EventType, { word: string; symbol: string }> = {
  wake: { word: 'Wake up', symbol: '🌅' },
  shower: { word: 'Shower', symbol: '🚿' },
  teeth: { word: 'Brush teeth', symbol: '🪥' },
  breakfast: { word: 'Breakfast', symbol: 'mb:breakfast_1' },
  lunch: { word: 'Lunch', symbol: 'mb:lunch_1' },
  dinner: { word: 'Dinner', symbol: '🍽️' },
  bed: { word: 'Bed', symbol: 'mb:double_bed' },
  activity: { word: 'Activity', symbol: '⭐' },
}

/**
 * Word and symbol for an event type, tolerating types this version doesn't
 * know yet (written by a newer copy of the app on another device): those show
 * as an Activity rather than crashing the screen.
 */
export function eventTypeInfo(type: string): { word: string; symbol: string } {
  return EVENT_TYPES[type as EventType] ?? EVENT_TYPES.activity
}

/** Order the "What?" picker shows event types in. */
export const EVENT_TYPE_ORDER: EventType[] = [
  'activity', 'breakfast', 'lunch', 'dinner', 'shower', 'teeth', 'wake', 'bed',
]

export const KIND_WORD: Record<LibraryKind, string> = {
  person: 'People',
  place: 'Places',
  food: 'Food',
  activity: 'Activities',
}

export const KIND_SYMBOL: Record<LibraryKind, string> = {
  person: '🧑',
  place: '📍',
  food: '🍽️',
  activity: '⭐',
}

export const RATING_FACES = {
  happy: { symbol: '😊', word: 'Happy' },
  angry: { symbol: '😠', word: 'Angry' },
  sad: { symbol: '😢', word: 'Sad' },
} as const

/** Symbol grid for "add a new word" (PRD §4.6 step 2), with simple word search. */
export interface SymbolChoice {
  symbol: string
  words: string[]
}

export const SYMBOL_GRID: SymbolChoice[] = [
  // people
  { symbol: '👩', words: ['woman', 'mum', 'lady', 'friend'] },
  { symbol: '👨', words: ['man', 'dad', 'friend'] },
  { symbol: '👵', words: ['grandma', 'nan', 'old'] },
  { symbol: '👴', words: ['grandad', 'old'] },
  { symbol: '👧', words: ['girl', 'niece'] },
  { symbol: '👦', words: ['boy', 'nephew'] },
  { symbol: '👶', words: ['baby'] },
  { symbol: '🧑‍⚕️', words: ['doctor', 'nurse', 'carer'] },
  { symbol: '👩‍🦰', words: ['woman', 'red hair'] },
  { symbol: '🧑‍🦱', words: ['curly', 'person'] },
  { symbol: '👫', words: ['friends', 'couple'] },
  { symbol: '👨‍👩‍👧', words: ['family'] },
  // places
  { symbol: '🏠', words: ['house', 'home'] },
  { symbol: '🏡', words: ['house', 'garden'] },
  { symbol: '🏢', words: ['flat', 'building', 'office'] },
  { symbol: '🏨', words: ['hotel'] },
  { symbol: '🏕️', words: ['camping', 'tent'] },
  { symbol: '🏖️', words: ['beach', 'seaside', 'holiday'] },
  { symbol: '🛒', words: ['supermarket', 'shop', 'shopping'] },
  { symbol: '👗', words: ['clothes', 'dress', 'shop'] },
  { symbol: '👟', words: ['shoes', 'trainers'] },
  { symbol: '🏊', words: ['swimming', 'pool'] },
  { symbol: '🌳', words: ['park', 'tree', 'garden'] },
  { symbol: '☕', words: ['cafe', 'coffee', 'tea'] },
  { symbol: '💇', words: ['hairdresser', 'hair'] },
  { symbol: '💅', words: ['nails', 'nail salon'] },
  { symbol: '🩺', words: ['doctor', 'hospital'] },
  { symbol: '🦷', words: ['dentist', 'teeth'] },
  { symbol: '🏥', words: ['hospital'] },
  { symbol: '⛪', words: ['church'] },
  { symbol: '🎬', words: ['cinema', 'film'] },
  { symbol: '🎭', words: ['theatre', 'show'] },
  { symbol: '🏟️', words: ['stadium', 'football'] },
  { symbol: '🎡', words: ['fair', 'funfair'] },
  { symbol: '🐘', words: ['zoo', 'animals'] },
  { symbol: '🚗', words: ['car', 'drive'] },
  { symbol: '🚌', words: ['bus'] },
  { symbol: '🚆', words: ['train'] },
  { symbol: '✈️', words: ['plane', 'airport', 'holiday', 'flying'] },
  { symbol: '⛴️', words: ['ferry', 'boat'] },
  { symbol: '🚕', words: ['taxi'] },
  // food
  { symbol: '🍞', words: ['toast', 'bread'] },
  { symbol: '🥣', words: ['cereal', 'porridge', 'bowl'] },
  { symbol: '🍳', words: ['eggs', 'fried', 'breakfast'] },
  { symbol: '🥪', words: ['sandwich'] },
  { symbol: '🍲', words: ['soup', 'stew'] },
  { symbol: '🥔', words: ['jacket potato', 'potato'] },
  { symbol: '🫘', words: ['beans'] },
  { symbol: '🍝', words: ['pasta', 'spaghetti'] },
  { symbol: '🍕', words: ['pizza'] },
  { symbol: '🐟', words: ['fish', 'fish and chips'] },
  { symbol: '🍟', words: ['chips', 'fries'] },
  { symbol: '🍗', words: ['chicken', 'roast'] },
  { symbol: '🍛', words: ['curry', 'rice'] },
  { symbol: '🌭', words: ['sausage', 'hot dog'] },
  { symbol: '🍔', words: ['burger'] },
  { symbol: '🥗', words: ['salad'] },
  { symbol: '🍎', words: ['apple', 'fruit'] },
  { symbol: '🍌', words: ['banana', 'fruit'] },
  { symbol: '🍰', words: ['cake'] },
  { symbol: '🎂', words: ['birthday', 'cake'] },
  { symbol: '🍦', words: ['ice cream'] },
  { symbol: '🍪', words: ['biscuits', 'cookie'] },
  { symbol: '🍫', words: ['chocolate'] },
  { symbol: '🍬', words: ['sweets'] },
  { symbol: '🍵', words: ['tea'] },
  { symbol: '🧃', words: ['juice'] },
  { symbol: '💧', words: ['water'] },
  { symbol: '🥛', words: ['milk'] },
  { symbol: '🥤', words: ['drink', 'fizzy', 'cola'] },
  // activities
  { symbol: '🚶', words: ['walk', 'walking'] },
  { symbol: '💻', words: ['computer', 'laptop'] },
  { symbol: '📺', words: ['tv', 'television', 'youtube'] },
  { symbol: '😴', words: ['sleeping', 'sleep', 'nap'] },
  { symbol: '🛁', words: ['bath'] },
  { symbol: '💆', words: ['massage', 'relax'] },
  { symbol: '🫧', words: ['bubbles'] },
  { symbol: '🎉', words: ['party', 'birthday party'] },
  { symbol: '🎁', words: ['present', 'gift'] },
  { symbol: '🎨', words: ['painting', 'art', 'craft'] },
  { symbol: '🎵', words: ['music'] },
  { symbol: '📚', words: ['book', 'reading', 'library'] },
  { symbol: '🧩', words: ['puzzle', 'jigsaw'] },
  { symbol: '🎮', words: ['games', 'gaming'] },
  { symbol: '🧹', words: ['cleaning', 'housework'] },
  { symbol: '🧺', words: ['washing', 'laundry'] },
  { symbol: '🍳', words: ['cooking'] },
  { symbol: '🚲', words: ['bike', 'cycling'] },
  { symbol: '🏖️', words: ['holiday', 'beach'] },
  { symbol: '🐕', words: ['dog', 'walk'] },
  { symbol: '🐈', words: ['cat'] },
  { symbol: '🐴', words: ['horse', 'riding'] },
  { symbol: '💊', words: ['medicine', 'tablets'] },
  { symbol: '💉', words: ['injection', 'jab'] },
  { symbol: '🛍️', words: ['shopping', 'bags'] },
  { symbol: '💳', words: ['bank', 'money', 'card'] },
  { symbol: '📞', words: ['phone', 'call'] },
  { symbol: '🎥', words: ['video', 'film'] },
  { symbol: '⭐', words: ['star', 'special'] },
  { symbol: '❤️', words: ['love', 'heart'] },
]

export function searchSymbols(q: string): SymbolChoice[] {
  const s = q.trim().toLowerCase()
  if (!s) return SYMBOL_GRID
  return SYMBOL_GRID.filter(c => c.words.some(w => w.includes(s)))
}
