import { useState } from 'react'
import { useStore } from '../../lib/store'
import { EVENT_TYPES, EVENT_TYPE_ORDER } from '../../lib/symbols'
import { nowHHMM, snapHalfHour } from '../../lib/time'
import { today } from '../../lib/dates'
import type { EventType, Id, ISODate, MealSlot } from '../../types'
import { MEAL_TYPES } from '../../types'
import { Sheet } from '../ui/Sheet'
import { Tile } from '../ui/Tile'
import { ItemPicker } from '../pickers/ItemPicker'
import { TimePicker } from '../pickers/TimePicker'

interface Props {
  date: ISODate
  onClose: () => void
}

type Step = { at: 'type' } | { at: 'pick'; type: EventType } | { at: 'time'; type: EventType; ids: Id[] }

/** Adding to the day: pick a type → pick from the list → pick a time → done. No typing (PRD §4.6). */
export function AddEventFlow({ date, onClose }: Props) {
  const store = useStore()
  const [step, setStep] = useState<Step>({ at: 'type' })
  const { familyMode, settings } = store.state

  const defaultTime = (type: EventType) => {
    const tpl = settings.template.find(t => t.type === type)
    if (tpl) return tpl.time
    return date === today() ? snapHalfHour(nowHHMM()) : '10:00'
  }

  const finish = async (type: EventType, ids: Id[], time: string) => {
    const isMeal = MEAL_TYPES.includes(type)
    await store.addEvent({
      date,
      type,
      time,
      activityId: type === 'activity' ? ids[0] ?? null : null,
      foodIds: isMeal ? ids : [],
    })
    const word = type === 'activity' && ids[0] ? store.state.items[ids[0]]?.name : EVENT_TYPES[type].word
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
              word={EVENT_TYPES[type].word}
              symbol={EVENT_TYPES[type].symbol}
              onSelect={() => {
                if (type === 'activity' || MEAL_TYPES.includes(type)) setStep({ at: 'pick', type })
                else setStep({ at: 'time', type, ids: [] })
              }}
            />
          ))}
        </div>
      </Sheet>
    )
  }

  if (step.at === 'pick') {
    const meal = MEAL_TYPES.includes(step.type)
    return (
      <ItemPicker
        kind={meal ? 'food' : 'activity'}
        title={meal ? EVENT_TYPES[step.type].word : 'Activity'}
        symbol={EVENT_TYPES[step.type].symbol}
        multi={meal}
        mealSlot={meal ? (step.type as MealSlot) : undefined}
        onBack={() => setStep({ at: 'type' })}
        onDone={ids => setStep({ at: 'time', type: step.type, ids })}
      />
    )
  }

  return (
    <TimePicker
      value={defaultTime(step.type)}
      fineMinutes={familyMode}
      onBack={() => setStep(step.type === 'activity' || MEAL_TYPES.includes(step.type) ? { at: 'pick', type: step.type } : { at: 'type' })}
      onDone={t => void finish(step.type, step.ids, t)}
    />
  )
}
