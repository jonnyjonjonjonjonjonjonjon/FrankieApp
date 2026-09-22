// ============================================================
// Frankie's Diary — data model (PRD §8, Phase 1 scope)
// ============================================================

export type Id = string
/** YYYY-MM-DD */
export type ISODate = string
/** 24-hour "HH:MM" */
export type HHMM = string

// ---------- Library items (people / places / foods / activities) ----------

export type LibraryKind = 'person' | 'place' | 'food' | 'activity'

export type PersonRole = 'family' | 'carer' | 'friend'
export type PlaceType = 'home' | 'shop' | 'pool' | 'friend' | 'accommodation' | 'other'
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
  // person
  role?: PersonRole
  /** MM-DD, recurs yearly (PRD §4.9). */
  birthday?: string | null
  // place
  placeType?: PlaceType
  // food
  meals?: MealSlot[]
  seeded: boolean
  deleted: boolean
  createdAt: string
  updatedAt: string
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

export const MEAL_TYPES: EventType[] = ['breakfast', 'lunch', 'dinner']

export type Rating = 'happy' | 'angry' | 'sad'

export interface DiaryEvent {
  id: Id
  date: ISODate
  type: EventType
  time: HHMM
  /** For type === 'activity'. */
  activityId: Id | null
  /** For meals. */
  foodIds: Id[]
  placeId: Id | null
  personIds: Id[]
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
  updatedAt: string
}

export const DEFAULT_TEMPLATE: TemplateItem[] = [
  { type: 'wake', time: '07:00' },
  { type: 'breakfast', time: '07:30' },
  { type: 'lunch', time: '11:30' },
  { type: 'dinner', time: '17:30' },
]

// ---------- Navigation ----------

export type Tab = 'today' | 'week' | 'month' | 'photos'

export type View =
  | { kind: 'today' }
  | { kind: 'week'; date: ISODate }
  | { kind: 'month'; date: ISODate }
  | { kind: 'day'; date: ISODate; from: Tab }
  | { kind: 'photos' }
  | { kind: 'settings' }
