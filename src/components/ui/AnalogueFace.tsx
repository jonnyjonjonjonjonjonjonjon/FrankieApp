/** Analogue clock face with numbers 1–12 (PRD §6 "Time she can read"). */
export function AnalogueFace({
  hour,
  minute,
  size = 96,
  className = '',
}: {
  hour: number
  minute: number
  size?: number
  className?: string
}) {
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
      <circle cx={r} cy={r} r={47} fill="#fff" stroke="#1a1a1a" strokeWidth={4} />
      {/* numbers */}
      {Array.from({ length: 12 }, (_, i) => {
        const n = i + 1
        const a = (n * 30 * Math.PI) / 180
        return (
          <text
            key={n}
            x={r + Math.sin(a) * 36}
            y={r - Math.cos(a) * 36}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={12}
            fontWeight={800}
            fontFamily="Roboto, 'Segoe UI', system-ui, Arial, sans-serif"
            fill="#1a1a1a"
          >
            {n}
          </text>
        )
      })}
      {hand(hourAngle, 17, 6.5)}
      {hand(minuteAngle, 25, 4)}
      <circle cx={r} cy={r} r={3.5} fill="#f26f21" />
    </svg>
  )
}
