import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  label: string
  items: ReactNode[]
  index: number
  onChange: (i: number) => void
}

const VISIBLE = 5 // rows showing: the chosen one plus two above and two below

/**
 * A scroll wheel (like a phone's time picker). Values snap into a highlighted
 * band in the middle; neighbours stay visible and fade towards the edges so
 * it is obvious the column scrolls. Up/down buttons do the same by tapping.
 */
export function Wheel({ label, items, index, onChange }: Props) {
  const scroller = useRef<HTMLDivElement>(null)
  const rowH = useRef(0)

  const measure = () => {
    const first = scroller.current?.querySelector<HTMLElement>('[data-row]')
    rowH.current = first?.offsetHeight ?? 0
    return rowH.current
  }

  // Start on the chosen value (no animation).
  useLayoutEffect(() => {
    const h = measure()
    if (scroller.current && h) scroller.current.scrollTop = index * h
    // on mount only; afterwards the wheel's own scroll is the source of truth
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onScroll = () => {
    const el = scroller.current
    const h = rowH.current || measure()
    if (!el || !h) return
    const i = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / h)))
    if (i !== index) onChange(i)
  }

  const go = (i: number) => {
    const el = scroller.current
    const h = rowH.current || measure()
    if (!el || !h) return
    const clamped = Math.max(0, Math.min(items.length - 1, i))
    el.scrollTo({ top: clamped * h, behavior: 'smooth' })
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => go(index - 1)}
        disabled={index === 0}
        aria-label={`${label} earlier`}
        className="flex h-12 w-full items-center justify-center rounded-xl border-2 border-line text-ink active:bg-soft disabled:opacity-30"
      >
        <ChevronUp size={36} strokeWidth={3} />
      </button>

      <div className="relative w-full">
        {/* The band the chosen value sits in */}
        <div
          className="pointer-events-none absolute inset-x-0 top-1/2 z-0 -translate-y-1/2 rounded-2xl border-4 border-orange-dark bg-orange-light"
          style={{ height: `calc(100% / ${VISIBLE})` }}
          aria-hidden
        />
        <div
          ref={scroller}
          onScroll={onScroll}
          role="listbox"
          aria-label={label}
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              go(index - 1)
            } else if (e.key === 'ArrowDown') {
              e.preventDefault()
              go(index + 1)
            }
          }}
          data-noswipe
          className="wheel relative z-10 overflow-y-scroll overscroll-contain outline-none"
          style={{
            height: `calc(var(--wheel-row) * ${VISIBLE})`,
            scrollSnapType: 'y mandatory',
            maskImage: 'linear-gradient(to bottom, transparent 0%, #000 30%, #000 70%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 30%, #000 70%, transparent 100%)',
          }}
        >
          {/* Padding so the first and last values can reach the middle */}
          <div style={{ height: `calc(var(--wheel-row) * ${(VISIBLE - 1) / 2})` }} aria-hidden />
          {items.map((item, i) => {
            const d = Math.abs(i - index)
            return (
              <div
                key={i}
                data-row
                role="option"
                aria-selected={i === index}
                onClick={() => go(i)}
                className="flex cursor-pointer items-center justify-center transition-[opacity,transform] duration-150"
                style={{
                  height: 'var(--wheel-row)',
                  scrollSnapAlign: 'center',
                  opacity: d === 0 ? 1 : d === 1 ? 0.6 : 0.35,
                  transform: `scale(${d === 0 ? 1 : 0.85})`,
                }}
              >
                {item}
              </div>
            )
          })}
          <div style={{ height: `calc(var(--wheel-row) * ${(VISIBLE - 1) / 2})` }} aria-hidden />
        </div>
      </div>

      <button
        type="button"
        onClick={() => go(index + 1)}
        disabled={index === items.length - 1}
        aria-label={`${label} later`}
        className="flex h-12 w-full items-center justify-center rounded-xl border-2 border-line text-ink active:bg-soft disabled:opacity-30"
      >
        <ChevronDown size={36} strokeWidth={3} />
      </button>
    </div>
  )
}
