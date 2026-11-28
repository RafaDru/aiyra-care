/** Métricas compartilhadas — rail bottom nav (web CSS + AppMobileBottomNavRail + Canvas). */

export const COMPACT_NAV_H = 56

const NERI_NAV_SIZE = 48
const NERI_NAV_SCALE = 1.12
const NERI_HULL_PAD = 6
const NERI_HULL_SIZE = NERI_NAV_SIZE + NERI_HULL_PAD
export const NERI_NAV_R = NERI_HULL_SIZE / 2
export const NERI_VISUAL_LIFT = (NERI_NAV_SIZE * (NERI_NAV_SCALE - 1)) / 2
export const NERI_RAIL_R = NERI_NAV_R * 1.3

/** Altura da cúpula acima do topo reto do rail (sem faixa extra). */
export const COMPACT_NAV_ARCH_RISE = Math.ceil(NERI_RAIL_R + NERI_VISUAL_LIFT + 2)