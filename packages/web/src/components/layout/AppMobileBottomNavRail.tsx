/** Faixa inferior contínua — topo reto + arco convexo sobre Neri (estrutural; paridade Canvas). */

import {
  COMPACT_NAV_H as NAV_H,
  NERI_RAIL_R,
  NERI_VISUAL_LIFT,
} from '../../lib/compact-bottom-nav-rail-metrics.js'

export function AppMobileBottomNavRail({ width = 390 }: { width?: number }) {
  const cx = width / 2
  const cy = -NERI_VISUAL_LIFT
  const halfChord = Math.sqrt(Math.max(0, NERI_RAIL_R * NERI_RAIL_R - cy * cy))
  const leftX = cx - halfChord
  const rightX = cx + halfChord
  const r = NERI_RAIL_R.toFixed(2)
  const vbMinY = cy - NERI_RAIL_R
  const vbH = NAV_H - vbMinY
  /** Corpo branco só abaixo da corda do arco — cúpula = contorno, conteúdo passa atrás do wash. */
  const flatFill = `M 0,0 H ${width} V ${NAV_H} H 0 Z`
  const groove = `M ${leftX.toFixed(2)},0 A ${r},${r} 0 0 0 ${rightX.toFixed(2)},0`
  const fill = 'var(--compact-nav-rail-fill, var(--card-bg, #fafbfc))'

  return (
    <div className="app-mobile-bottom-nav__rail" aria-hidden>
      <svg
        className="app-mobile-bottom-nav__rail-svg"
        width="100%"
        height={vbH}
        viewBox={`0 ${vbMinY.toFixed(2)} ${width} ${vbH.toFixed(2)}`}
        preserveAspectRatio="none"
      >
        <path d={flatFill} fill={fill} />
        <path d={flatFill} fill="none" stroke="rgba(226,232,240,0.85)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <path
          d={groove}
          fill="none"
          stroke="rgba(203,213,225,0.55)"
          strokeWidth={1}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  )
}