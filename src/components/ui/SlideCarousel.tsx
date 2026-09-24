import { useEffect, useRef, useState, type ReactNode, type TouchEvent, type TransitionEvent } from 'react'

interface Props {
  /** Identifies the centre day; when it changes the track is rebuilt at rest. */
  centre: string
  /** Render the panel for an offset of -1, 0 or +1 days from the current one. */
  render: (offset: -1 | 0 | 1) => ReactNode
  /** Called once the slide has finished; the parent then changes the date. */
  onSettle: (direction: -1 | 1) => void
  /** Bump this to trigger an arrow-driven slide from the parent. */
  request: { dir: -1 | 1; n: number } | null
}

const THRESHOLD = 70

/**
 * Three panels (yesterday, today, tomorrow) on a track that sits one panel to
 * the left (margin, not transform). Dragging moves the track with the finger;
 * releasing past the threshold slides to the neighbour. When it lands the
 * parent changes the date and the track is REMOUNTED at rest: no transform
 * left on it, so low-end GPUs cannot keep a stale copy of the old day.
 */
export function DayCarousel({ centre, render, onSettle, request }: Props) {
  const [dx, setDx] = useState(0)
  const [animTo, setAnimTo] = useState<-1 | 1 | 0 | null>(null) // null = free, 0 = snapping back
  const [dragging, setDragging] = useState(false)
  const [width, setWidth] = useState(0)
  const start = useRef<{ x: number; y: number; horizontal: boolean | null } | null>(null)
  const track = useRef<HTMLDivElement>(null)
  const lastRequest = useRef(0)

  useEffect(() => {
    if (request && request.n !== lastRequest.current) {
      lastRequest.current = request.n
      setWidth(track.current?.clientWidth ?? window.innerWidth)
      setAnimTo(request.dir)
    }
  }, [request])

  const onTouchStart = (e: TouchEvent) => {
    if (animTo !== null) return
    if ((e.target as HTMLElement).closest('[data-noswipe]')) return
    const t = e.touches[0]
    start.current = { x: t.clientX, y: t.clientY, horizontal: null }
    setWidth(track.current?.clientWidth ?? window.innerWidth)
  }
  const onTouchMove = (e: TouchEvent) => {
    const s = start.current
    if (!s) return
    const t = e.touches[0]
    const mx = t.clientX - s.x
    const my = t.clientY - s.y
    if (s.horizontal === null) {
      if (Math.abs(mx) < 8 && Math.abs(my) < 8) return
      s.horizontal = Math.abs(mx) > Math.abs(my)
      if (s.horizontal) setDragging(true)
    }
    if (s.horizontal) setDx(mx)
  }
  const onTouchEnd = () => {
    const s = start.current
    start.current = null
    setDragging(false)
    if (!s || !s.horizontal) return
    if (dx <= -THRESHOLD) setAnimTo(1)
    else if (dx >= THRESHOLD) setAnimTo(-1)
    else setAnimTo(0)
  }

  const onTransitionEnd = (e: TransitionEvent) => {
    // Only the track's own slide counts, not transitions on rows inside it.
    if (e.target !== e.currentTarget || animTo === null) return
    const dir = animTo
    setDx(0)
    setAnimTo(null)
    // Changing the date changes `centre`, which remounts the track at rest.
    if (dir !== 0) onSettle(dir)
  }

  const shift = animTo === null ? dx : animTo === 0 ? 0 : -animTo * width
  const moving = shift !== 0 || animTo !== null
  const transition = animTo === null && dragging ? 'none' : 'transform 260ms ease-out'

  return (
    <div className="h-full overflow-hidden" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}>
      <div
        key={centre}
        ref={track}
        className="flex h-full w-full"
        style={{
          marginLeft: '-100%',
          transform: moving ? `translate3d(${shift}px, 0, 0)` : undefined,
          transition: moving ? transition : undefined,
          touchAction: 'pan-y',
        }}
        onTransitionEnd={onTransitionEnd}
      >
        {([-1, 0, 1] as const).map(o => (
          <div key={o} className="h-full w-full shrink-0 overflow-hidden">
            {render(o)}
          </div>
        ))}
      </div>
    </div>
  )
}
