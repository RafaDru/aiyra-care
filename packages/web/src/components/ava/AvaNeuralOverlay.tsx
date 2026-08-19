import type { CSSProperties } from 'react'

/**
 * Estrelas neurais — só no arco dourado do FUNDO do PNG (acima do rosto).
 * Coordenadas em % do viewBox; animação ascendente suave (twinkle).
 */
const LIGHTS = [
  { cx: 50, cy: 11, r: 1.9 },
  { cx: 38, cy: 13, r: 1.7 },
  { cx: 62, cy: 13, r: 1.7 },
  { cx: 28, cy: 16, r: 1.5 },
  { cx: 72, cy: 16, r: 1.5 },
  { cx: 22, cy: 19, r: 1.4 },
  { cx: 34, cy: 18, r: 1.6 },
  { cx: 50, cy: 17, r: 1.8 },
  { cx: 66, cy: 18, r: 1.6 },
  { cx: 78, cy: 19, r: 1.4 },
  { cx: 26, cy: 22, r: 1.3 },
  { cx: 42, cy: 21, r: 1.5 },
  { cx: 58, cy: 21, r: 1.5 },
  { cx: 74, cy: 22, r: 1.3 },
] as const

const LIGHTS_ORDERED = [...LIGHTS]
  .map((light, idx) => ({ ...light, idx }))
  .sort((a, b) => b.cy - a.cy)

const LINKS: Array<[number, number]> = [
  [0, 1], [0, 2], [1, 7], [2, 8], [1, 3], [2, 4],
  [3, 6], [4, 8], [5, 6], [6, 7], [7, 8], [8, 9],
  [6, 10], [7, 11], [8, 12], [9, 13],
  [10, 11], [11, 12], [12, 13],
]

export function AvaNeuralOverlay({ analyzing = false }: { analyzing?: boolean }) {
  return (
    <svg
      className={[
        'ava-avatar__neural',
        analyzing && 'ava-avatar__neural--analyzing',
      ].filter(Boolean).join(' ')}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
    >
      <g className="ava-avatar__neural-links" fill="none" stroke="#FFE566" strokeWidth="0.35" strokeLinecap="round">
        {LINKS.map(([a, b], i) => (
          <line
            key={i}
            x1={LIGHTS[a].cx}
            y1={LIGHTS[a].cy}
            x2={LIGHTS[b].cx}
            y2={LIGHTS[b].cy}
            className="ava-avatar__neural-line"
          />
        ))}
      </g>
      <g className="ava-avatar__xmas-lights">
        {LIGHTS_ORDERED.map((light, order) => (
          <g
            key={light.idx}
            className="ava-avatar__xmas-light"
            style={{ '--order': order } as CSSProperties}
          >
            <circle
              className="ava-avatar__xmas-glow"
              cx={light.cx}
              cy={light.cy}
              r={light.r * 2.8}
            />
            <circle
              className="ava-avatar__xmas-core"
              cx={light.cx}
              cy={light.cy}
              r={light.r}
            />
          </g>
        ))}
      </g>
    </svg>
  )
}
