import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useStore } from '../../lib/store'
import { track } from '../../lib/usage'
import { longDate } from '../../lib/dates'
import type { ISODate, PhotoRecord } from '../../types'
import { BigButton } from '../ui/BigButton'
import { Photo } from '../ui/Photo'
import { Symbol } from '../ui/Symbol'
import { Sheet } from '../ui/Sheet'
import { PhotoInput } from '../pickers/PhotoInput'

/** Photo strip at the bottom of the day: take a photo in-app or add from the gallery. */
export function PhotoStrip({ date }: { date: ISODate }) {
  const store = useStore()
  const photos = store.photosFor(date)
  const [open, setOpen] = useState<PhotoRecord | null>(null)

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-2xl font-extrabold">
          <Symbol symbol="📷" size="text-4xl" /> Photos
        </h3>
        <PhotoInput size="sm" onPick={f => void store.addPhoto(date, f)} />
      </div>
      {photos.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2" data-noswipe>
          {photos.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                track('photo_view')
                setOpen(p)
              }}
              className="h-36 w-36 shrink-0 overflow-hidden rounded-2xl border-4 border-ink active:scale-95"
            >
              <Photo id={p.id} className="h-full w-full" />
            </button>
          ))}
        </div>
      )}
      {open && (
        <Sheet
          title={longDate(date)}
          onBack={() => setOpen(null)}
          footer={
            <BigButton
              variant="danger"
              onClick={() => {
                void store.deletePhoto(open.id)
                setOpen(null)
              }}
            >
              <Trash2 size={36} strokeWidth={2.5} />
              Remove
            </BigButton>
          }
        >
          <div className="flex h-full items-center justify-center">
            <Photo id={open.id} className="max-h-full max-w-full rounded-2xl" />
          </div>
        </Sheet>
      )}
    </section>
  )
}
