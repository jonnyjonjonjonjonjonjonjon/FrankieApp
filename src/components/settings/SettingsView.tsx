import { useState } from 'react'
import { Download, LogOut, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useStore } from '../../lib/store'
import { eventTypeInfo, EVENT_TYPE_ORDER } from '../../lib/symbols'
import type { EventType, TemplateItem } from '../../types'
import { BigButton } from '../ui/BigButton'
import { PinPad } from '../ui/PinPad'
import { Sheet } from '../ui/Sheet'
import { Symbol } from '../ui/Symbol'
import { Tile } from '../ui/Tile'
import { TimeLabel } from '../ui/TimeLabel'
import { TopBar } from '../ui/TopBar'
import { ItemPicker } from '../pickers/ItemPicker'
import { TimePicker } from '../pickers/TimePicker'
import { Birthdays } from './Birthdays'
import { FamilyAccounts } from './FamilyAccounts'
import { ThisDevice } from './ThisDevice'
import { UsageStats } from './UsageStats'
import { WordsManager } from './WordsManager'

function Section({ title, symbol, children }: { title: string; symbol: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-3xl border-4 border-line p-4">
      <h3 className="flex items-center gap-3 text-3xl font-extrabold">
        <Symbol symbol={symbol} size="text-4xl" /> {title}
      </h3>
      {children}
    </section>
  )
}

/** Family/carer mode behind a PIN: birthdays, routine times, home, words, Frankie's use, PIN, export, start again (PRD §6, §7). */
export function SettingsView() {
  const store = useStore()
  const { settings, familyMode } = store.state
  const [editTime, setEditTime] = useState<number | null>(null)
  const [addType, setAddType] = useState(false)
  const [pickHome, setPickHome] = useState(false)
  const [changingPin, setChangingPin] = useState(false)
  const [resetArmed, setResetArmed] = useState(false)

  const back = () => store.go({ kind: 'today' })

  if (!familyMode) {
    return (
      <div className="flex h-full flex-col">
        <TopBar onBack={back} title="Family" />
        <div className="flex-1 overflow-y-auto">
          {settings.pin ? (
            <PinPad
              title="Family PIN"
              onSubmit={pin => {
                const ok = pin === settings.pin
                if (ok) store.setFamilyMode(true)
                return ok
              }}
            />
          ) : (
            <PinPad
              title="Choose a family PIN"
              onSubmit={async pin => {
                await store.updateSettings({ pin })
                store.setFamilyMode(true)
                return true
              }}
            />
          )}
        </div>
      </div>
    )
  }

  const template = settings.template
  const setTemplate = (t: TemplateItem[]) => void store.setTemplate([...t].sort((a, b) => a.time.localeCompare(b.time)))
  const home = settings.homePlaceId ? store.state.items[settings.homePlaceId] : null

  const exportData = () => {
    const blob = new Blob([store.exportJSON()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `frankies-diary-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar
        onBack={back}
        title="Family settings"
        right={
          <BigButton
            onClick={() => {
              // Back first, while still in Family mode: the family handing back isn't counted as Frankie's use.
              back()
              store.setFamilyMode(false)
            }}
          >
            <LogOut size={32} strokeWidth={2.5} />
            Leave
          </BigButton>
        }
      />
      <div className="flex-1 overflow-y-auto p-3">
        <div className="mx-auto flex max-w-4xl flex-col gap-5">
          <Section title="Birthdays" symbol="🎂">
            <Birthdays />
          </Section>

          <Section title="Daily routine" symbol="🕒">
            {template.map((t, i) => (
              <div key={`${t.type}-${i}`} className="flex items-center gap-3 rounded-2xl border-4 border-line p-2">
                <Symbol symbol={eventTypeInfo(t.type).symbol} size="text-5xl" />
                <span className="flex-1 text-2xl font-extrabold">{eventTypeInfo(t.type).word}</span>
                <BigButton onClick={() => setEditTime(i)}>
                  <TimeLabel time={t.time} />
                </BigButton>
                <BigButton size="sm" variant="danger" onClick={() => setTemplate(template.filter((_, j) => j !== i))} aria-label="Remove">
                  <Trash2 size={28} strokeWidth={2.5} />
                </BigButton>
              </div>
            ))}
            <BigButton variant="primary" className="self-start" onClick={() => setAddType(true)}>
              <Plus size={36} strokeWidth={3} /> Add to routine
            </BigButton>
            <p className="text-lg text-ink-soft">Days already opened keep their own copy of the routine; changes apply to days not yet opened.</p>
          </Section>

          <Section title="Home" symbol="🏠">
            <BigButton className="self-start" onClick={() => setPickHome(true)}>
              <Symbol symbol={home?.symbol ?? '🏠'} size="text-4xl" />
              {home?.name ?? 'Choose'}
            </BigButton>
          </Section>

          <Section title="Words" symbol="mb:pencil">
            <WordsManager />
          </Section>

          <Section title="Frankie's use" symbol="mb:graph_column">
            <UsageStats />
          </Section>

          <Section title="PIN" symbol="🔒">
            {changingPin ? (
              <PinPad
                title="New family PIN"
                onSubmit={async pin => {
                  await store.updateSettings({ pin })
                  setChangingPin(false)
                  store.toast('PIN changed')
                  return true
                }}
              />
            ) : (
              <BigButton className="self-start" onClick={() => setChangingPin(true)}>
                Change PIN
              </BigButton>
            )}
          </Section>

          <Section title="This device" symbol="🔋">
            <ThisDevice />
          </Section>

          <Section title="Family accounts" symbol="👨‍👩‍👧">
            <FamilyAccounts />
          </Section>

          <Section title="Data" symbol="💾">
            <div className="flex flex-wrap gap-3">
              <BigButton onClick={exportData}>
                <Download size={32} strokeWidth={2.5} /> Export everything
              </BigButton>
              <BigButton
                variant={resetArmed ? 'primary' : 'danger'}
                onClick={() => {
                  if (!resetArmed) {
                    setResetArmed(true)
                    setTimeout(() => setResetArmed(false), 5000)
                    return
                  }
                  void store.resetEverything()
                }}
              >
                <RotateCcw size={32} strokeWidth={2.5} />
                {resetArmed ? 'Tap again to wipe everything' : 'Start again'}
              </BigButton>
            </div>
            <p className="text-lg text-ink-soft">Export downloads a copy of everything on this device. Start again wipes this device only.</p>
          </Section>

          <Section title="Symbols" symbol="⭐">
            <p className="text-lg text-ink-soft">
              Symbols by{' '}
              <a className="underline" href="https://mulberrysymbols.org" target="_blank" rel="noreferrer">
                Mulberry Symbols
              </a>{' '}
              © Steve Lee, and{' '}
              <a className="underline" href="https://openmoji.org" target="_blank" rel="noreferrer">
                OpenMoji
              </a>
              . Both are shared under the{' '}
              <a className="underline" href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">
                CC BY-SA 4.0
              </a>{' '}
              licence.
            </p>
          </Section>
        </div>
      </div>

      {editTime !== null && (
        <TimePicker
          title={eventTypeInfo(template[editTime].type).word}
          value={template[editTime].time}
          onBack={() => setEditTime(null)}
          onDone={t => {
            if (t) setTemplate(template.map((x, i) => (i === editTime ? { ...x, time: t } : x)))
            setEditTime(null)
          }}
        />
      )}
      {addType && (
        <Sheet title="Add to routine" symbol="🕒" onBack={() => setAddType(false)}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {EVENT_TYPE_ORDER.filter(t => t !== 'activity' && t !== 'travel').map((type: EventType) => (
              <Tile
                key={type}
                word={eventTypeInfo(type).word}
                symbol={eventTypeInfo(type).symbol}
                onSelect={() => {
                  setTemplate([...template, { type, time: '12:00' }])
                  setAddType(false)
                }}
              />
            ))}
          </div>
        </Sheet>
      )}
      {pickHome && (
        <ItemPicker
          kind="place"
          title="Home"
          symbol="🏠"
          onBack={() => setPickHome(false)}
          onDone={ids => {
            if (ids[0]) void store.updateSettings({ homePlaceId: ids[0] })
            setPickHome(false)
          }}
        />
      )}
    </div>
  )
}
