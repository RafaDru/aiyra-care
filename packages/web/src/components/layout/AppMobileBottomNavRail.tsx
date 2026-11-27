/** Faixa inferior contínua — topo reto + arco convexo sobre Neri (estrutural; paridade Canvas). */

const NAV_H = 56
const NERI_NAV_SIZE = 48
const NERI_NAV_SCALE = 1.12
const NERI_HULL_PAD = 6
const NERI_HULL_SIZE = NERI_NAV_SIZE + NERI_HULL_PAD
const NERI_NAV_R = NERI_HULL_SIZE / 2
const NERI_VISUAL_LIFT = (NERI_NAV_SIZE * (NERI_NAV_SCALE - 1)) / 2
const NERI_RAIL_R = NERI_NAV_R * 1.3

export function AppMobileBottomNavRail({ width = 390 }: { width?: number }) {
  const cx = width / 2
  const cy = -NERI_VISUAL_LIFT
  const halfChord = Math.sqrt(Math.max(0, NERI_RAIL_R * NERI_RAIL_R - cy * cy))
  const leftX = cx - halfChord
  const rightX = cx + halfChord
  const r = NERI_RAIL_R.toFixed(2)
  const vbMinY = cy - NERI_RAIL_R
  const vbH = NAV_H - vbMinY
  const shell = `M 0,0 H ${leftX.toFixed(2)} A ${r},${r} 0 0 0 ${rightX.toFixed(2)},0 H ${width} V ${NAV_H} H 0 Z`
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
        <path d={shell} fill={fill} />
        <path d={shell} fill="none" stroke="rgba(226,232,240,0.85)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
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