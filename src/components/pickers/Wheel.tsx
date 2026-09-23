import { memo, useLayoutEffect, useRef, type ReactNode } from 'react'

interface Props {
  label: string
  items: ReactNode[]
  index: number
  onChange: (i: number) => void
}

const VISIBLE = 5 // rows showing: the chosen one plus two above and two below

/**
 * A scroll wheel (like a phone's time picker). Values snap into the orange
 * band in the middle; the neighbours stay visible under a fixed fade so it is
 * obvious the column scrolls. Tapping a visible value moves to it.
 *
 * Rows never change style while scrolling and the fade is a static overlay,
 * so the scroll itself does no layout or repaint work (smooth on low-end GPUs).
 */
export const Wheel = memo(function Wheel({ label, items, index, onChange }: Props) {
  const scroller = useRef<HTMLDivElement>(null)
  const rowH = useRef(0)
  const frame = useRef(0)
  const last = useRef(index)

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
    if (frame.current) return
    frame.current = requestAnimationFrame(() => {
      frame.current = 0
      const el = scroller.current
      const h = rowH.current || measure()
      if (!el || !h) return
      const i = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / h)))
      if (i !== last.current) {
        last.current = i
        onChange(i)
      }
    })
  }

  const go = (i: number) => {
    const el = scroller.current
    const h = rowH.current || measure()
    if (!el || !h) return
    el.scrollTo({ top: Math.max(0, Math.min(items.length - 1, i)) * h, behavior: 'smooth' })
  }

  const pad = <div style={{ height: `calc(var(--wheel-row) * ${(VISIBLE - 1) / 2})` }} aria-hidden />
  const fade = 'pointer-events-none absolute inset-x-0 z-20 from-paper to-transparent'

  return (
    <div className="relative w-full" style={{ height: `calc(var(--wheel-row) * ${VISIBLE})` }}>
      {/* The band the chosen value sits in */}
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 z-0 -translate-y-1/2 rounded-2xl border-4 border-orange-dark bg-orange-light"
        style={{ height: 'var(--wheel-row)' }}
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
            go(last.current - 1)
          } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            go(last.current + 1)
          }
        }}
        data-noswipe
        className="wheel relative z-10 h-full overflow-y-scroll overscroll-contain outline-none"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {pad}
        {items.map((item, i) => (
          <div
            key={i}
            data-row
            role="option"
            aria-selected={i === index}
            onClick={() => go(i)}
            className="flex cursor-pointer items-center justify-center"
            style={{ height: 'var(--wheel-row)', scrollSnapAlign: 'center' }}
          >
            {item}
          </div>
        ))}
        {pad}
      </div>
      {/* Static fades above and below the band */}
      <div className={`${fade} top-0 bg-gradient-to-b`} style={{ height: 'calc(var(--wheel-row) * 1.6)' }} aria-hidden />
      <div className={`${fade} bottom-0 bg-gradient-to-t`} style={{ height: 'calc(var(--wheel-row) * 1.6)' }} aria-hidden />
    </div>
  )
})
