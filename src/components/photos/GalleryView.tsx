import { longDate } from '../../lib/dates'
import { useStore } from '../../lib/store'
import type { PhotoRecord } from '../../types'
import { Photo } from '../ui/Photo'
import { Symbol } from '../ui/Symbol'
import { TopBar } from '../ui/TopBar'

/** All photos grouped by day, newest first; tap a photo to jump to its day (PRD §4.10). */
export function GalleryView() {
  const store = useStore()
  const photos = store.allPhotos()
  const groups = photos.reduce<Record<string, PhotoRecord[]>>((acc, p) => {
    ;(acc[p.date] ??= []).push(p)
    return acc
  }, {})
  const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a))

  return (
    <div className="flex h-full flex-col">
      <TopBar title="Photos" />
      <div className="flex-1 overflow-y-auto p-3">
        {dates.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-ink-soft">
            <Symbol symbol="📷" size="text-8xl" />
            <span className="text-2xl font-bold">No photos yet</span>
          </div>
        )}
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          {dates.map(d => (
            <section key={d} className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => store.go({ kind: 'day', date: d, from: 'photos' })}
                className="self-start text-left text-3xl font-extrabold underline decoration-4 underline-offset-4"
              >
                {longDate(d)}
              </button>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {groups[d].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => store.go({ kind: 'day', date: d, from: 'photos' })}
                    className="aspect-square overflow-hidden rounded-2xl border-4 border-ink active:scale-95"
                  >
                    <Photo id={p.id} className="h-full w-full" />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
