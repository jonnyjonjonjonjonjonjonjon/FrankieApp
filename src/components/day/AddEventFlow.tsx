import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useStore } from '../../lib/store'
import { eventTypeInfo, EVENT_TYPE_ORDER, WHERE_TO_SYMBOL } from '../../lib/symbols'
import type { EventType, Id, ISODate, MealSlot } from '../../types'
import { MEAL_TYPES } from '../../types'
import { Sheet } from '../ui/Sheet'
import { Symbol } from '../ui/Symbol'
import { Tile } from '../ui/Tile'
import { NoButton } from '../ui/YesNo'
import { ItemPicker } from '../pickers/ItemPicker'

interface Props {
  date: ISODate
  onClose: () => void
}

type Step = { at: 'type' } | { at: 'pick'; type: EventType } | { at: 'where'; travelId: Id }

/**
 * Adding to the day: pick a type → pick from the list → done (PRD §4.6).
 * Travel is two picks: how she is going, then where to (or Yes for just "Bus").
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

  const finishTravel = async (travelId: Id, placeId: Id | null) => {
    await store.addEvent({ date, type: 'travel', travelId, placeId })
    store.toast(`${store.state.items[travelId]?.name ?? eventTypeInfo('travel').word} added`)
    onClose()
  }

  if (step.at === 'type') {
    return (
      <Sheet title="Add" symbol="➕" onBack={onClose} hideBack footer={<NoButton onClick={onClose} />}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {EVENT_TYPE_ORDER.map(type => (
            <Tile
              key={type}
              word={eventTypeInfo(type).word}
              symbol={eventTypeInfo(type).symbol}
              onSelect={() => {
                if (type === 'activity' || type === 'travel' || MEAL_TYPES.includes(type)) setStep({ at: 'pick', type })
                else void finish(type, [])
              }}
            />
          ))}
        </div>
      </Sheet>
    )
  }

  if (step.at === 'where') {
    const mode = store.state.items[step.travelId]
    return (
      <ItemPicker
        key="where"
        kind="place"
        title="Where to?"
        symbol={WHERE_TO_SYMBOL}
        before={
          mode && (
            <span className="inline-flex shrink-0 items-center gap-2">
              <Symbol symbol={mode.symbol} size="text-4xl" />
              <span>{mode.name}</span>
              <ArrowRight size={32} strokeWidth={3} aria-hidden />
            </span>
          )
        }
        onSkip={() => void finishTravel(step.travelId, null)}
        onBack={() => setStep({ at: 'pick', type: 'travel' })}
        onDone={ids => void finishTravel(step.travelId, ids[0] ?? null)}
      />
    )
  }

  if (step.type === 'travel') {
    return (
      <ItemPicker
        key="travel"
        kind="travel"
        title="Travel"
        symbol={eventTypeInfo('travel').symbol}
        onBack={() => setStep({ at: 'type' })}
        onDone={ids => ids[0] && setStep({ at: 'where', travelId: ids[0] })}
      />
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
