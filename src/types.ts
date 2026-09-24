// ============================================================
// Frankie's Diary — data model (PRD §8, Phase 1 scope)
// ============================================================

export type Id = string
/** YYYY-MM-DD */
export type ISODate = string
/** 24-hour "HH:MM" */
export type HHMM = string

// ---------- Library items (people / places / foods / activities / travel) ----------

export type LibraryKind = 'person' | 'place' | 'food' | 'activity' | 'travel'

export type PersonRole = 'family' | 'carer' | 'friend'
export type PlaceType = 'home' | 'shop' | 'pool' | 'friend' | 'accommodation' | 'medical' | 'other'
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'treat' | 'drink'

export interface LibraryItem {
  id: Id
  kind: LibraryKind
  /** The single word Frankie reads on the tile. */
  name: string
  /** Makaton-style symbol. Emoji placeholder until Makaton licensing is confirmed (PRD §11.6). */
  symbol: string
  photoId: Id | null
  /** Tile flip state — remembered per tile (PRD §4.5, `showPhotoByDefault`). */
  showPhoto: boolean
  /** Display order (lower first); items without one follow, by name. Seeds use their list index. */
  order?: number
  /**
   * Shelf within its kind (see lib/categories.ts). Missing on records from
   * older versions and on unedited seeds: read it with categoryOf().
   */
  category?: string
  // person
  /** @deprecated since categories (backlog item 3): use category. Still read for old records. */
  role?: PersonRole
  /** MM-DD, recurs yearly (PRD §4.9). */
  birthday?: string | null
  /** Year of birth, optional: shows the age on the birthday band. */
  birthYear?: number | null
  // place
  placeType?: PlaceType
  /** Place Frankie can be "staying at" (shown in the Staying at picker). */
  stayable?: boolean
  // food
  /** @deprecated for grouping (use category); still written by meal pickers so older copies keep their order. */
  meals?: MealSlot[]
  /** Where a photo from the web came from (shown in the word editor); cleared when the photo changes. */
  photoCredit?: PhotoCredit | null
  seeded: boolean
  deleted: boolean
  createdAt: string
  updatedAt: string
}

/** Credit for an openly licensed picture found on the web (backlog item 2). */
export interface PhotoCredit {
  title: string
  creator?: string
  license?: string
  /** The picture's page at its source. */
  url?: string
}

// ---------- Events ----------

export type EventType =
  | 'wake'
  | 'shower'
  | 'teeth'
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'bed'
  | 'activity'
  | 'travel'

export const MEAL_TYPES: EventType[] = ['breakfast', 'lunch', 'dinner']

export type Rating = 'happy' | 'angry' | 'sad'

export interface DiaryEvent {
  id: Id
  date: ISODate
  type: EventType
  /** Optional: the day is an ordered list first, times are extra. */
  time: HHMM | null
  /** Position in the day's list (lower first). */
  order: number
  /** For type === 'activity'. */
  activityId: Id | null
  /**
   * For type === 'travel': how she is going (a 'travel' library item). Where
   * to is placeId. Missing on records from older versions: treat as null.
   */
  travelId?: Id | null
  /** For meals. */
  foodIds: Id[]
  placeId: Id | null
  personIds: Id[]
  /** Unused since v0.1.16 (tick-off removed); kept for old records. */
  done: boolean
  rating: Rating | null
  fromTemplate: boolean
  deleted: boolean
  createdAt: string
  updatedAt: string
}

// ---------- Days ----------

export interface DayRecord {
  date: ISODate
  /** null = her own house (settings.homePlaceId). */
  stayingAtId: Id | null
  /** Template events have been written into this day. */
  templateApplied: boolean
  updatedAt: string
}

// ---------- Photos ----------

export interface PhotoRecord {
  id: Id
  date: ISODate
  eventId: Id | null
  deleted: boolean
  createdAt: string
  updatedAt: string
}

// ---------- Settings ----------

export interface TemplateItem {
  type: EventType
  time: HHMM
}

export interface Settings {
  id: 'settings'
  /** Family/carer mode PIN. null = not set yet. */
  pin: string | null
  template: TemplateItem[]
  homePlaceId: Id | null
  /** Bumped when seed data or the default routine changes so existing diaries get tidied once. */
  templateVersion?: number
  updatedAt: string
}

export const DEFAULT_TEMPLATE: TemplateItem[] = [
  { type: 'breakfast', time: '07:30' },
  { type: 'lunch', time: '11:30' },
  { type: 'dinner', time: '17:30' },
]

// ---------- Usage stats ----------

/**
 * What one device was used for on one day (backlog item 5): counts only,
 * never content. One writer per doc (its own device), so last-write-wins is
 * exact. Kept in its own local database and Firestore collection `usage`,
 * never in the diary's state.
 */
export interface UsageDay {
  /** `${deviceId}_${date}` */
  id: string
  deviceId: string
  deviceLabel: string
  /** This device was marked as Frankie's tablet when counted. */
  frankie: boolean
  date: ISODate
  /** Per part of the app (keys in lib/usage.ts: underscores only, safe as Firestore field names). */
  counts: Record<string, number>
  /** Times the app was opened, or come back to after a while away. */
  sessions: number
  /** Minutes with at least one tap. */
  minutes: number
  updatedAt: string
}

// ---------- Navigation ----------

export type Tab = 'today' | 'week' | 'month' | 'photos'

export type View =
  | { kind: 'today' }
  | { kind: 'week'; date: ISODate }
  | { kind: 'month'; date: ISODate }
  | { kind: 'day'; date: ISODate; from: Tab }
  | { kind: 'photos' }
  | { kind: 'settings' }
