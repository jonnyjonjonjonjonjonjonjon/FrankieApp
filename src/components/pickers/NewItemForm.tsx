import { useState } from 'react'
import { useStore } from '../../lib/store'
import { defaultCategory } from '../../lib/categories'
import { KIND_WORD } from '../../lib/symbols'
import type { LibraryItem, LibraryKind, MealSlot } from '../../types'
import { Sheet } from '../ui/Sheet'
import { NoButton, YesButton } from '../ui/YesNo'
import { NewItemFields } from './NewItemFields'
import { draftReady, newDraft, saveDraft } from './newItemDraft'

interface Props {
  kind: LibraryKind
  mealSlot?: MealSlot
  /** The shelf it starts on (the tab it was made from); the family can change it. */
  category?: string | null
  /** Extra fields to set on the new item (e.g. a stay place). */
  extra?: Partial<LibraryItem>
  onCreated: (item: LibraryItem) => void
  onBack: () => void
}

/**
 * Add a new word (PRD §4.6): Word → Shelf → Picture (symbol and/or photo) → Yes, on one screen.
 * This is the only place Frankie types.
 */
export function NewItemForm({ kind, mealSlot, category, extra, onCreated, onBack }: Props) {
  const store = useStore()
  const [draft, setDraft] = useState(() => newDraft(category ?? defaultCategory(kind)))
  const [saving, setSaving] = useState(false)
  const canSave = draftReady(draft) && !saving

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    const item = await saveDraft(store, kind, draft, { mealSlot, extra })
    setSaving(false)
    onCreated(item)
  }

  return (
    <Sheet
      title={`New — ${KIND_WORD[kind]}`}
      symbol="➕"
      onBack={onBack}
      hideBack
      footer={
        <>
          <NoButton onClick={onBack} />
          <YesButton disabled={!canSave} onClick={() => void save()} />
        </>
      }
    >
      <NewItemFields kind={kind} draft={draft} onChange={setDraft} />
    </Sheet>
  )
}
