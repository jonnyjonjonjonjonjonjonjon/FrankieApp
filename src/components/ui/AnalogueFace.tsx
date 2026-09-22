/** Small analogue clock face echoing a time (PRD §6 "Time she can read"). */
export function AnalogueFace({ hour, minute, size = 96, className = '' }: { hour: number; minute: number; size?: number; className?: string }) {
  const r = 50
  const hourAngle = ((hour % 12) + minute / 60) * 30
  const minuteAngle = minute * 6
  const hand = (angle: number, len: number, width: number) => {
    const a = ((angle - 90) * Math.PI) / 180
    return (
      <line
        x1={r}
        y1={r}
        x2={r + Math.cos(a) * len}
        y2={r + Math.sin(a) * len}
        stroke="#1a1a1a"
        strokeWidth={width}
        strokeLinecap="round"
      />
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden className={`shrink-0 ${className}`}>
      <circle cx={r} cy={r} r={47} fill="#fff" stroke="#1a1a1a" strokeWidth={5} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 * Math.PI) / 180
        const big = i % 3 === 0
        return (
          <line
            key={i}
            x1={r + Math.sin(a) * (big ? 36 : 40)}
            y1={r - Math.cos(a) * (big ? 36 : 40)}
            x2={r + Math.sin(a) * 44}
            y2={r - Math.cos(a) * 44}
            stroke="#1a1a1a"
            strokeWidth={big ? 5 : 3}
            strokeLinecap="round"
          />
        )
      })}
      {hand(hourAngle, 24, 8)}
      {hand(minuteAngle, 36, 5)}
      <circle cx={r} cy={r} r={4} fill="#f26f21" />
    </svg>
  )
}
