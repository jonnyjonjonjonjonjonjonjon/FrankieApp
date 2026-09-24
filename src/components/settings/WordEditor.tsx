import { useState } from 'react'
import { BedDouble, Stethoscope, Trash2 } from 'lucide-react'
import { categoriesFor, categoryOf, SHELF_MEAL } from '../../lib/categories'
import { monthDayLabel } from '../../lib/dates'
import { useStore } from '../../lib/store'
import { track } from '../../lib/usage'
import type { Id, LibraryItem, PhotoCredit } from '../../types'
import { BigButton } from '../ui/BigButton'
import { Sheet } from '../ui/Sheet'
import { Symbol } from '../ui/Symbol'
import { NoButton, YesButton } from '../ui/YesNo'
import { MonthDayPicker } from '../pickers/MonthDayPicker'
import { PictureChooser } from '../pickers/PictureChooser'
import { ShelfButtons } from '../pickers/ShelfButtons'

function Field({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-2xl font-extrabold">{title}</h3>
      {children}
    </section>
  )
}

/** Small print under a web picture: what it is, who made it and its licence (Creative Commons asks for this). */
function Credit({ credit }: { credit: PhotoCredit | null }) {
  if (!credit) return null
  return (
    <p className="text-lg text-ink-soft">
      Picture:{' '}
      {credit.url ? (
        <a className="underline" href={credit.url} target="_blank" rel="noreferrer">
          {credit.title}
        </a>
      ) : (
        credit.title
      )}
      {credit.creator && ` by ${credit.creator}`}
      {credit.license && `, ${credit.license}`}
    </p>
  )
}

/** An on/off button (aria-pressed), orange when on. */
function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <BigButton variant={on ? 'primary' : 'secondary'} aria-pressed={on} onClick={onClick} className="self-start">
      {children}
    </BigButton>
  )
}

/**
 * Change one word (backlog item 15): its name, picture, shelf and the few
 * settings of its kind. Nothing is saved until Yes; No leaves it as it was.
 * Remove is a soft delete with Undo (and Restore under Words → Removed).
 */
export function WordEditor({ itemId, onClose }: { itemId: Id; onClose: () => void }) {
  const store = useStore()
  const item: LibraryItem | undefined = store.state.items[itemId]
  // The word as it was when the editor opened: save() compares against this, not the live copy,
  // which a sync from another device may change while the editor is open.
  const [initial] = useState(item)
  const [name, setName] = useState(item?.name ?? '')
  const [symbol, setSymbol] = useState(item?.symbol ?? '')
  const [newPhoto, setNewPhoto] = useState<Blob | null>(null)
  /** Where the new photo came from, if the web; the saved photo's credit shows while it is kept. */
  const [newCredit, setNewCredit] = useState<PhotoCredit | null>(null)
  const [keptPhotoId, setKeptPhotoId] = useState<Id | null>(item?.photoId ?? null)
  const [showPhoto, setShowPhoto] = useState(item?.showPhoto ?? false)
  const [category, setCategory] = useState(item ? categoryOf(item) : null)
  const [birthday, setBirthday] = useState(item?.birthday ?? null)
  const [birthYear, setBirthYear] = useState(item?.birthYear ?? null)
  const [stayable, setStayable] = useState(Boolean(item?.stayable))
  const [medical, setMedical] = useState(item?.placeType === 'medical')
  const [pickBirthday, setPickBirthday] = useState(false)
  const [saving, setSaving] = useState(false)

  if (!item) return null
  const hasPhoto = Boolean(newPhoto || keptPhotoId)
  const canSave = name.trim().length > 0 && Boolean(symbol || hasPhoto) && !saving

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    // Only what was changed here is written: an untouched field keeps any newer edit from another device.
    const was = initial ?? item
    const photoRemoved = Boolean(was.photoId && !keptPhotoId)
    const photoChanged = Boolean(newPhoto) || photoRemoved
    if (newPhoto) {
      if (newCredit) track('word_web')
      await store.setItemPhoto(item.id, newPhoto, newCredit)
    }
    else if (photoRemoved) await store.setItemPhoto(item.id, null)
    const patch: Partial<LibraryItem> = {}
    const trimmed = name.trim()
    if (trimmed !== was.name) patch.name = trimmed
    if (symbol !== was.symbol) patch.symbol = symbol
    const wantPhoto = hasPhoto && showPhoto
    const now = store.state.items[item.id] ?? item
    if ((photoChanged || wantPhoto !== Boolean(was.showPhoto)) && wantPhoto !== Boolean(now.showPhoto)) patch.showPhoto = wantPhoto
    if (categoriesFor(item.kind).length && category && category !== categoryOf(was)) {
      patch.category = category
      // Older copies sort their meal pickers by the meal tag, so it moves with the shelf.
      if (item.kind === 'food' && SHELF_MEAL[category]) patch.meals = [SHELF_MEAL[category]]
    }
    if (item.kind === 'person') {
      if (birthday !== (was.birthday ?? null)) patch.birthday = birthday
      if (birthYear !== (was.birthYear ?? null)) patch.birthYear = birthYear
    }
    if (item.kind === 'place') {
      if (stayable !== Boolean(was.stayable)) patch.stayable = stayable
      if (medical !== (was.placeType === 'medical')) patch.placeType = medical ? 'medical' : 'other'
    }
    if (Object.keys(patch).length) await store.updateItem(item.id, patch)
    store.toast(`${trimmed} saved`)
    onClose()
  }

  if (pickBirthday) {
    return (
      <MonthDayPicker
        title={name || item.name}
        value={birthday}
        birthYear={birthYear}
        allowNone={Boolean(birthday)}
        onBack={() => setPickBirthday(false)}
        onDone={v => {
          setBirthday(v?.md ?? null)
          setBirthYear(v?.birthYear ?? null)
          setPickBirthday(false)
        }}
      />
    )
  }

  return (
    <Sheet
      title={item.name}
      symbol="mb:pencil"
      onBack={onClose}
      hideBack
      footer={
        <>
          <BigButton
            variant="danger"
            size="lg"
            className="mr-auto max-sm:px-3"
            aria-label="Remove"
            onClick={() => {
              void store.deleteItem(item.id)
              onClose()
            }}
          >
            <Trash2 size={36} strokeWidth={2.5} />
            {/* Just the bin on phones, so Remove, No and Yes stay on one line */}
            <span className="text-2xl font-extrabold max-sm:sr-only">Remove</span>
          </BigButton>
          <NoButton onClick={onClose} />
          <YesButton disabled={!canSave} onClick={() => void save()} />
        </>
      }
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <Field title="Word">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            aria-label="Word"
            autoComplete="off"
            className="min-h-24 w-full rounded-2xl border-4 border-ink px-4 text-4xl font-extrabold outline-none focus:border-orange"
          />
        </Field>

        {categoriesFor(item.kind).length > 0 && (
          <Field title="Shelf">
            <ShelfButtons kind={item.kind} value={category} onChange={setCategory} />
          </Field>
        )}

        {item.kind === 'person' && (
          <Field title="Birthday">
            <BigButton className="self-start" onClick={() => setPickBirthday(true)}>
              <Symbol symbol="🎂" size="text-4xl" />
              <span>{birthday ? monthDayLabel(birthday) : 'Add'}</span>
              {birthday && birthYear && <span className="text-ink-soft">{birthYear}</span>}
            </BigButton>
          </Field>
        )}

        {item.kind === 'place' && (
          <Field title="Place">
            <div className="flex flex-wrap gap-3">
              <Toggle on={stayable} onClick={() => setStayable(v => !v)}>
                <BedDouble size={32} strokeWidth={2.5} />
                <span className={stayable ? 'text-white' : ''}>Frankie can stay here</span>
              </Toggle>
              <Toggle on={medical} onClick={() => setMedical(v => !v)}>
                <Stethoscope size={32} strokeWidth={2.5} />
                <span className={medical ? 'text-white' : ''}>Doctor or dentist</span>
              </Toggle>
            </div>
          </Field>
        )}

        <Field title="Picture">
          <PictureChooser
            word={name}
            symbol={symbol}
            onSymbol={setSymbol}
            photo={newPhoto}
            onPhoto={(p, credit) => {
              setNewPhoto(p)
              setNewCredit(credit)
              setShowPhoto(true)
            }}
            keptPhotoId={keptPhotoId}
            onClearPhoto={() => {
              setNewPhoto(null)
              setNewCredit(null)
              setKeptPhotoId(null)
            }}
          />
          <Credit credit={newPhoto ? newCredit : keptPhotoId ? (item.photoCredit ?? null) : null} />
          {hasPhoto && (
            <Toggle on={showPhoto} onClick={() => setShowPhoto(v => !v)}>
              <span className={showPhoto ? 'text-white' : ''}>Show photo first</span>
            </Toggle>
          )}
        </Field>
      </div>
    </Sheet>
  )
}
