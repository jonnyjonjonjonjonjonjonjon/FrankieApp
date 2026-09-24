import { useState } from 'react'
import { useStore } from '../../lib/store'
import { eventTypeInfo, EVENT_TYPE_ORDER } from '../../lib/symbols'
import type { EventType, Id, ISODate, MealSlot } from '../../types'
import { MEAL_TYPES } from '../../types'
import { Sheet } from '../ui/Sheet'
import { Tile } from '../ui/Tile'
import { ItemPicker } from '../pickers/ItemPicker'

interface Props {
  date: ISODate
  onClose: () => void
}

type Step = { at: 'type' } | { at: 'pick'; type: EventType }

/**
 * Adding to the day: pick a type → pick from the list → done (PRD §4.6).
 * No time is asked for; the row's clock button adds one later if wanted.
 */
export function AddEventFlow({ date, onClose }: Props) {
  const store = useStore()
  const [step, setStep] = useState<Step>({ at: 'type' })

  const finish = async (type: EventType, ids: Id[]) => {
    const isMeal = MEAL_TYPES.includes(type)
    await store.addEvent({
      date,
      type,
      activityId: type === 'activity' ? ids[0] ?? null : null,
      foodIds: isMeal ? ids : [],
    })
    const word = type === 'activity' && ids[0] ? store.state.items[ids[0]]?.name : eventTypeInfo(type).word
    store.toast(`${word} added`)
    onClose()
  }

  if (step.at === 'type') {
    return (
      <Sheet title="Add" symbol="➕" onBack={onClose}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {EVENT_TYPE_ORDER.map(type => (
            <Tile
              key={type}
              word={eventTypeInfo(type).word}
              symbol={eventTypeInfo(type).symbol}
              onSelect={() => {
                if (type === 'activity' || MEAL_TYPES.includes(type)) setStep({ at: 'pick', type })
                else void finish(type, [])
              }}
            />
          ))}
        </div>
      </Sheet>
    )
  }

  const meal = MEAL_TYPES.includes(step.type)
  return (
    <ItemPicker
      kind={meal ? 'food' : 'activity'}
      title={meal ? eventTypeInfo(step.type).word : 'Activity'}
      symbol={eventTypeInfo(step.type).symbol}
      multi={meal}
      mealSlot={meal ? (step.type as MealSlot) : undefined}
      onBack={() => setStep({ at: 'type' })}
      onDone={ids => void finish(step.type, ids)}
    />
  )
}
