import { useState, type ReactNode } from 'react'
import { isEmptyRow, isMeal } from '../../lib/eventFace'
import { useStore } from '../../lib/store'
import { EAT_SYMBOL, EVENT_TYPE_ORDER, eventTypeInfo, WHERE_TO_SYMBOL } from '../../lib/symbols'
import type { DiaryEvent, EventType, HHMM, Id, LibraryKind, MealSlot } from '../../types'
import { MEAL_TYPES } from '../../types'
import { BigButton } from '../ui/BigButton'
import { Symbol } from '../ui/Symbol'
import { Tile } from '../ui/Tile'
import { ClearButton, NoButton, YesButton } from '../ui/YesNo'
import { ChoiceGrid } from '../pickers/ChoiceGrid'
import { NewItemForm } from '../pickers/NewItemForm'
import { TimeWheels } from '../pickers/TimePicker'
import { TryNew } from '../pickers/TryNew'

/** A part of a day row that can be set from the row itself. */
export type Slot = 'time' | 'what' | 'food' | 'where' | 'who' | 'change'

export const WHAT_SYMBOL = 'mb:what'
export const WHO_SYMBOL = 'mb:who'
export const WHERE_SYMBOL = 'mb:where'
export const FOOD_SYMBOL = EAT_SYMBOL
/** The other kinds of row, offered after the activities under What? (a new row starts as an activity). */
const OTHER_TYPES = EVENT_TYPE_ORDER.filter(t => t !== 'activity')
const GRID = 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'
const CHANGE_SYMBOL = 'mb:change-to'

interface Props {
  date: string
  event: DiaryEvent
  /** The part being set, or null for the row's own strip (Change, Remove). */
  panel: Slot | null
  onPanel: (panel: Slot | null) => void
}

/**
 * Setting a day row without leaving the day (owner, Sept 2026; replaces the item screen). Tapping a
 * row opens it: this strip slides open under it with Change (activity or travel) and Remove, while the row shows its empty slots (a clock, What?, Where?, Who?). Tapping a slot, or
 * something already set, opens its choices here instead, with No / Yes; New and Try (rare) still
 * open their full screens.
 */
export function RowEditor({ date, event, panel, onPanel }: Props) {
  const store = useStore()
  const travel = event.type === 'travel'
  const meal = isMeal(event)

  // Multi-choice answers (foods, people) wait for Yes; single choices save at once.
  const [chosen, setChosen] = useState<Id[]>([])
  const [time, setTime] = useState<HHMM>(event.time ?? '10:00')
  // New / Try: the full-screen forms, for the kind being chosen.
  const [adding, setAdding] = useState<{ kind: LibraryKind; category: string | null } | null>(null)
  const [trying, setTrying] = useState<{ kind: 'food' | 'activity'; shelf: string | null; query: string } | null>(null)
  const [openedFor, setOpenedFor] = useState<Slot | null>(null)
  // A panel starts from what the row has now.
  if (openedFor !== panel) {
    setOpenedFor(panel)
    setChosen(panel === 'food' ? event.foodIds : panel === 'who' ? event.personIds : [])
    setTime(event.time ?? '10:00')
  }

  const save = (patch: Partial<DiaryEvent>) => void store.updateEvent(date, event.id, patch)
  const toggle = (id: Id) => setChosen(c => (c.includes(id) ? c.filter(x => x !== id) : [...c, id]))
  const picked = (id: Id) => {
    if (panel === 'food' || panel === 'who') toggle(id)
    else if (panel === 'where') {
      save({ placeId: id })
      onPanel(null)
    } else if (panel === 'change' || panel === 'what') {
      save(travel ? { travelId: id } : { activityId: id })
      onPanel(null)
    }
  }
  /** What? can also make the row another kind: travel then asks how, a meal asks what food. */
  const pickType = async (type: EventType) => {
    await store.updateEvent(date, event.id, { type, activityId: null })
    onPanel(type === 'travel' ? 'change' : MEAL_TYPES.includes(type) ? 'food' : null)
  }

  if (adding) {
    return (
      <NewItemForm
        kind={adding.kind}
        mealSlot={meal ? (event.type as MealSlot) : undefined}
        category={adding.category}
        onBack={() => setAdding(null)}
        onCreated={item => {
          setAdding(null)
          picked(item.id)
        }}
      />
    )
  }
  if (trying) {
    return (
      <TryNew
        kind={trying.kind}
        shelf={trying.shelf}
        query={trying.query}
        mealSlot={meal ? (event.type as MealSlot) : undefined}
        onBack={() => setTrying(null)}
        onAdded={item => {
          setTrying(null)
          picked(item.id)
        }}
      />
    )
  }

  if (!panel) {
    // Only an activity or a journey can be changed from here (a new row's What? chooses it; an empty
    // row goes by itself). Removing is the bin on the row's corner.
    if (isEmptyRow(event) || !((event.type === 'activity' && event.activityId) || travel)) return null
    return (
      <Drawer>
        <div className="flex justify-end">
          <BigButton onClick={() => onPanel('change')}>
            <Symbol symbol={CHANGE_SYMBOL} size="text-4xl" />
            <span className="text-xl font-extrabold">Change</span>
          </BigButton>
        </div>
      </Drawer>
    )
  }

  const kind: LibraryKind =
    panel === 'food' ? 'food' : panel === 'who' ? 'person' : panel === 'where' ? 'place' : travel ? 'travel' : 'activity'
  const tryKind = kind === 'food' || kind === 'activity' ? kind : null
  const heading: { word: string; symbol: string } =
    panel === 'time'
      ? { word: 'When?', symbol: '🕒' }
      : panel === 'what'
        ? { word: 'What?', symbol: WHAT_SYMBOL }
        : panel === 'food'
        ? { word: eventTypeInfo(event.type).word, symbol: eventTypeInfo(event.type).symbol }
        : panel === 'who'
          ? { word: 'Who?', symbol: WHO_SYMBOL }
          : panel === 'where'
            ? { word: travel ? 'Where to?' : 'Where?', symbol: travel ? WHERE_TO_SYMBOL : WHERE_SYMBOL }
            : travel
              ? { word: 'Travel', symbol: eventTypeInfo('travel').symbol }
              : { word: 'Activity', symbol: eventTypeInfo('activity').symbol }

  let answers: ReactNode
  if (panel === 'time') {
    answers = (
      <>
        {event.time && (
          <ClearButton
            onClick={() => {
              void store.setEventTime(date, event.id, null)
              onPanel(null)
            }}
          />
        )}
        <NoButton compact onClick={() => onPanel(null)} />
        <YesButton
          compact
          onClick={() => {
            void store.setEventTime(date, event.id, time)
            onPanel(null)
          }}
        />
      </>
    )
  } else if (panel === 'food' || panel === 'who') {
    answers = (
      <>
        <NoButton compact onClick={() => onPanel(null)} />
        <YesButton
          compact
          onClick={() => {
            save(panel === 'food' ? { foodIds: chosen } : { personIds: chosen })
            onPanel(null)
          }}
        />
      </>
    )
  } else {
    answers = (
      <>
        {/* Taking the What? away too can leave the row empty: then it goes once she moves on. */}
        {panel === 'change' && !travel && event.activityId && (
          <ClearButton
            onClick={() => {
              save({ activityId: null })
              onPanel(null)
            }}
          />
        )}
        {panel === 'where' && event.placeId && (
          <ClearButton
            onClick={() => {
              save({ placeId: null })
              onPanel(null)
            }}
          />
        )}
        <NoButton compact onClick={() => onPanel(null)} />
      </>
    )
  }

  const current = panel === 'where' ? (event.placeId ? [event.placeId] : []) : panel === 'change' || panel === 'what' ? [travel ? event.travelId : event.activityId].filter((x): x is Id => Boolean(x)) : chosen
  return (
    <Drawer>
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="flex min-w-0 flex-[1_1_12rem] items-center gap-2">
          <Symbol symbol={heading.symbol} size="text-4xl" />
          <span className="text-3xl font-extrabold">{heading.word}</span>
        </h3>
        <div className="ml-auto flex shrink-0 flex-wrap gap-3">{answers}</div>
      </div>
      <div key={panel} className="fade-in">
        {panel === 'time' ? (
          <TimeWheels value={event.time ?? '10:00'} onChange={setTime} />
        ) : (
          <ChoiceGrid
            kind={kind}
            selected={current}
            mealSlot={panel === 'food' ? (event.type as MealSlot) : undefined}
            onPick={picked}
            onNew={category => setAdding({ kind, category })}
            onTry={tryKind ? at => setTrying({ kind: tryKind, ...at }) : undefined}
            findButton
          />
        )}
        {panel === 'what' && (
          <div className={`mt-4 ${GRID}`}>
            {OTHER_TYPES.map(t => (
              <Tile key={t} word={eventTypeInfo(t).word} symbol={eventTypeInfo(t).symbol} onSelect={() => void pickType(t)} />
            ))}
          </div>
        )}
      </div>
    </Drawer>
  )
}

/** The part that slides open under a row, joined to it. */
function Drawer({ children }: { children: ReactNode }) {
  return (
    <div data-noswipe className="unroll mx-2 -mt-1 flex flex-col gap-3 rounded-b-2xl border-[3px] border-t-0 border-orange bg-orange-light p-3">
      {children}
    </div>
  )
}
