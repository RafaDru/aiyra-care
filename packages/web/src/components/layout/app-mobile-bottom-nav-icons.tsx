/** Ícones bottom nav compact — paridade Canvas (coração, família 3×, gancho, grade). */

import {
  COMPACT_NAV_ICON_PX,
  COMPACT_NAV_ICON_VIEWBOX,
  FAMILY_HEART_CLUSTER,
} from '../../lib/compact-bottom-nav-icon-metrics.js'

const HEART_FILLED =
  'M923 283.6a260.04 260.04 0 00-56.9-82.8 264.4 264.4 0 00-84-55.5A265.34 265.34 0 00679.7 125c-49.3 0-97.4 13.5-139.2 39-10 6.1-19.5 12.8-28.5 20.1-9-7.3-18.5-14-28.5-20.1-41.8-25.5-89.9-39-139.2-39-35.5 0-69.9 6.8-102.4 20.3-31.4 13-59.7 31.7-84 55.5a258.44 258.44 0 00-56.9 82.8c-13.9 32.3-21 66.6-21 101.9 0 33.3 6.8 68 20.3 103.3 11.3 29.5 27.5 60.1 48.2 91 32.8 48.9 77.9 99.9 133.9 151.6 92.8 85.7 184.7 144.9 188.6 147.3l23.7 15.2c10.5 6.7 24 6.7 34.5 0l23.7-15.2c3.9-2.5 95.7-61.6 188.6-147.3 56-51.7 101.1-102.7 133.9-151.6 20.7-30.9 37-61.5 48.2-91 13.5-35.3 20.3-70 20.3-103.3.1-35.3-7-69.6-20.9-101.9z'

const HEART_OUTLINED = `${HEART_FILLED}M512 814.8S156 586.7 156 385.5C156 283.6 240.3 201 344.3 201c73.1 0 136.5 40.8 167.7 100.4C543.2 241.8 606.6 201 679.7 201c104 0 188.3 82.6 188.3 184.5 0 201.2-356 429.3-356 429.3z`

const PHONE_FILLED =
  'M885.6 230.2L779.1 123.8a80.83 80.83 0 00-57.3-23.8c-21.7 0-42.1 8.5-57.4 23.8L549.8 238.4a80.83 80.83 0 00-23.8 57.3c0 21.7 8.5 42.1 23.8 57.4l83.8 83.8A393.82 393.82 0 01553.1 553 395.34 395.34 0 01437 633.8L353.2 550a80.83 80.83 0 00-57.3-23.8c-21.7 0-42.1 8.5-57.4 23.8L123.8 664.5a80.89 80.89 0 00-23.8 57.4c0 21.7 8.5 42.1 23.8 57.4l106.3 106.3c24.4 24.5 58.1 38.4 92.7 38.4 7.3 0 14.3-.6 21.2-1.8 134.8-22.2 268.5-93.9 376.4-201.7C828.2 612.8 899.8 479.2 922.3 344c6.8-41.3-6.9-83.8-36.7-113.8z'

const PHONE_OUTLINED =
  'M877.1 238.7L770.6 132.3c-13-13-30.4-20.3-48.8-20.3s-35.8 7.2-48.8 20.3L558.3 246.8c-13 13-20.3 30.5-20.3 48.9 0 18.5 7.2 35.8 20.3 48.9l89.6 89.7a405.46 405.46 0 01-86.4 127.3c-36.7 36.9-79.6 66-127.2 86.6l-89.6-89.7c-13-13-30.4-20.3-48.8-20.3a68.2 68.2 0 00-48.8 20.3L132.3 673c-13 13-20.3 30.5-20.3 48.9 0 18.5 7.2 35.8 20.3 48.9l106.4 106.4c22.2 22.2 52.8 34.9 84.2 34.9 6.5 0 12.8-.5 19.2-1.6 132.4-21.8 263.8-92.3 369.9-198.3C818 606 888.4 474.6 910.4 342.1c6.3-37.6-6.3-76.3-33.3-103.4zm-37.6 91.5c-19.5 117.9-82.9 235.5-178.4 331s-213 158.9-330.9 178.4c-14.8 2.5-30-2.5-40.8-13.2L184.9 721.9 295.7 611l119.8 120 .9.9 21.6-8a481.29 481.29 0 00285.7-285.8l8-21.6-120.8-120.7 110.8-110.9 104.5 104.5c10.8 10.8 15.8 26 13.3 40.8z'

const APPSTORE_OUTLINED =
  'M464 144H160c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V160c0-8.8-7.2-16-16-16zm-52 268H212V212h200v200zm452-268H560c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V160c0-8.8-7.2-16-16-16zm-52 268H612V212h200v200zM464 544H160c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V560c0-8.8-7.2-16-16-16zm-52 268H212V612h200v200zm452-268H560c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V560c0-8.8-7.2-16-16-16zm-52 268H612V612h200v200z'

const APPSTORE_FILLED =
  'M864 144H560c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V160c0-8.8-7.2-16-16-16zm0 400H560c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V560c0-8.8-7.2-16-16-16zM464 144H160c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V160c0-8.8-7.2-16-16-16zm0 400H160c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V560c0-8.8-7.2-16-16-16z'

function SvgIcon({ d, color }: { d: string; color: string }) {
  return (
    <svg width={COMPACT_NAV_ICON_PX} height={COMPACT_NAV_ICON_PX} viewBox={COMPACT_NAV_ICON_VIEWBOX} aria-hidden>
      <path fill={color} d={d} />
    </svg>
  )
}

function FamilyHeart({
  cx,
  cy,
  fill,
  scale,
  outlined,
}: {
  cx: number
  cy: number
  fill: string
  scale: number
  outlined?: boolean
}) {
  return (
    <g transform={`translate(${cx} ${cy}) scale(${scale}) translate(-512 -512)`}>
      <path fill={fill} d={outlined ? HEART_OUTLINED : HEART_FILLED} />
    </g>
  )
}

export function MobileNavIconHome({ active, muted, primary }: { active: boolean; muted: string; primary: string }) {
  const c = active ? primary : muted
  return <SvgIcon d={active ? HEART_FILLED : HEART_OUTLINED} color={c} />
}

export function MobileNavIconFamily({
  active,
  muted,
  primary,
  familyPink,
}: {
  active: boolean
  muted: string
  primary: string
  familyPink: string
}) {
  const ink = (role: 'top' | 'bottom') => {
    if (!active) return muted
    return role === 'top' ? primary : familyPink
  }
  const { top, left, right } = FAMILY_HEART_CLUSTER
  const topScale = active ? top.scaleActive : top.scaleIdle
  const sideScale = (side: { scaleActive: number; scaleIdle: number }) =>
    active ? side.scaleActive : side.scaleIdle
  return (
    <svg
      width={COMPACT_NAV_ICON_PX}
      height={COMPACT_NAV_ICON_PX}
      viewBox={COMPACT_NAV_ICON_VIEWBOX}
      aria-hidden
    >
      <FamilyHeart cx={top.cx} cy={top.cy} fill={ink('top')} scale={topScale} outlined={!active} />
      <FamilyHeart
        cx={left.cx}
        cy={left.cy}
        fill={ink('bottom')}
        scale={sideScale(left)}
        outlined={!active}
      />
      <FamilyHeart
        cx={right.cx}
        cy={right.cy}
        fill={ink('bottom')}
        scale={sideScale(right)}
        outlined={!active}
      />
    </svg>
  )
}

export function MobileNavIconEmergency({ active, muted, emergency }: { active: boolean; muted: string; emergency: string }) {
  const c = active ? emergency : muted
  return <SvgIcon d={active ? PHONE_FILLED : PHONE_OUTLINED} color={c} />
}

export function MobileNavIconServices({ active, muted, primary }: { active: boolean; muted: string; primary: string }) {
  const c = active ? primary : muted
  return <SvgIcon d={active ? APPSTORE_FILLED : APPSTORE_OUTLINED} color={c} />
}