/**
 * Symbols are pictures, not emoji: Mulberry Symbols first (designed for adults
 * with learning disabilities), OpenMoji where Mulberry has nothing suitable.
 * Both are bundled in public/symbols/ so they look the same on every device.
 *
 * A symbol value is either "mb:<name>" (a Mulberry file) or an emoji. An emoji
 * is drawn as its Mulberry equivalent from EMOJI_TO_MULBERRY if there is one,
 * otherwise as the matching OpenMoji picture.
 */

const BASE = `${import.meta.env.BASE_URL}symbols/`

/** Emoji the app uses → the Mulberry symbol that means the same thing. */
export const EMOJI_TO_MULBERRY: Record<string, string> = {
  "👩": "mum_parent",
  "👨": "dad_parent",
  "👵": "grandmother",
  "👴": "grandfather",
  "👶": "baby",
  "🧑‍⚕️": "nurse_1a",
  "👨‍👩‍👧": "family",
  "🏠": "house",
  "🏡": "house",
  "🏢": "office_block",
  "🏖️": "beach",
  "🛒": "shop",
  "👗": "clothes_female",
  "👟": "trainers",
  "🏊": "swim-to",
  "🌳": "park-to",
  "☕": "cafe",
  "💇": "haircut",
  "💅": "nail_polish",
  "🩺": "doctor_1a",
  "🦷": "dentist_1a",
  "⛪": "church",
  "🎡": "theme_park",
  "🐘": "elephant",
  "🚗": "car",
  "🚌": "bus",
  "🚆": "train",
  "✈️": "aeroplane",
  "⛴️": "ferry",
  "🚕": "taxi",
  "🍞": "toast",
  "🥣": "cereal_bowl",
  "🍳": "egg_fried",
  "🥪": "sandwich",
  "🍲": "soup",
  "🥔": "jacket_potato_1",
  "🫘": "beans_on_toast",
  "🍝": "pasta",
  "🍕": "pizza",
  "🐟": "fish_and_chips",
  "🍟": "chips",
  "🍗": "roast_dinner",
  "🍛": "curry",
  "🌭": "sausage_and_mash",
  "🍔": "hamburger",
  "🥗": "salad",
  "🍎": "apple",
  "🍌": "banana",
  "🍰": "cake",
  "🎂": "birthday_cake",
  "🍦": "ice_cream",
  "🍪": "biscuits",
  "🍫": "chocolate_bar",
  "🍬": "sweet",
  "🍵": "tea",
  "🧃": "orange_juice",
  "💧": "water",
  "🥛": "milk",
  "🥤": "drink",
  "🚶": "walk-to",
  "💻": "computer_1",
  "📺": "flatscreen_tv",
  "😴": "sleep_female-to",
  "🛁": "bath",
  "🫧": "bubbles",
  "🎉": "party_celebration",
  "🎁": "present",
  "🎨": "paint-to",
  "🎵": "music",
  "🧩": "jigsaw_puzzle",
  "🎮": "computer_game",
  "🧹": "broom",
  "🧺": "laundry_basket",
  "🚲": "bicycle",
  "🐕": "dog",
  "🐈": "cat",
  "🐴": "horse",
  "💊": "medicine",
  "💳": "bank_card",
  "📞": "telephone_handset",
  "🎥": "video_camera",
  "⭐": "star",
  "❤️": "heart",
  "🕒": "clock",
  "📍": "where",
  "🧑": "who",
  "🍽️": "dinner",
  "🛏️": "double_bed",
  "📷": "camera",
  "➕": "add",
  "📅": "calendar",
  "🔌": "plug_2",
  "🔋": "battery_1",
  "😊": "happy_lady",
  "😠": "angry_lady",
  "😢": "sad_lady",
  "🌅": "wake_up-to",
  "🚿": "shower",
  "🪥": "brush_teeth-to",
  "☀️": "sun",
  "🌙": "Moon",
}

/** Emoji → OpenMoji file code: code points in hex, variation selectors dropped. */
export function openMojiCode(emoji: string): string {
  return [...emoji]
    .map(c => c.codePointAt(0)!)
    .filter(cp => cp !== 0xfe0f)
    .map(cp => cp.toString(16).toUpperCase())
    .join('-')
}

const strip = (s: string) => s.replace(/\uFE0F/g, '')
const EMOJI_KEYS = new Map(Object.entries(EMOJI_TO_MULBERRY).map(([e, m]) => [strip(e), m]))

export function isMulberry(symbol: string): boolean {
  return symbol.startsWith('mb:')
}

/** The picture URL for a symbol value. */
export function symbolSrc(symbol: string): string {
  if (isMulberry(symbol)) return `${BASE}mulberry/${symbol.slice(3)}.svg`
  const mb = EMOJI_KEYS.get(strip(symbol))
  if (mb) return `${BASE}mulberry/${mb}.svg`
  return `${BASE}openmoji/${openMojiCode(symbol)}.svg`
}

/** Resolve an emoji to the stored value: its Mulberry id if it has one. */
export function preferMulberry(symbol: string): string {
  if (isMulberry(symbol)) return symbol
  const mb = EMOJI_KEYS.get(strip(symbol))
  return mb ? `mb:${mb}` : symbol
}

export interface MulberryEntry {
  id: string
  label: string
}

let indexPromise: Promise<MulberryEntry[]> | null = null
/** The full Mulberry list (about 3,000 names), loaded once when first searched. */
export function mulberryIndex(): Promise<MulberryEntry[]> {
  if (!indexPromise) {
    indexPromise = fetch(`${BASE}mulberry/index.json`)
      .then(r => (r.ok ? r.json() : []))
      .then((rows: [string, string][]) => rows.map(([id, label]) => ({ id, label })))
      .catch(() => [])
  }
  return indexPromise
}
