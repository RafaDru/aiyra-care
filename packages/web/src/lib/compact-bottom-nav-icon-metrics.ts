/** ViewBox e tamanho óptico — paridade Ant Design × Canvas bottom nav / tiles. */
export const COMPACT_NAV_ICON_VIEWBOX = '64 64 896 896'
export const COMPACT_NAV_ICON_PX = 20

/** Triângulo 1+2 — cabe no mesmo ink box que Início/Serviços (sem crop lateral). */
export const FAMILY_HEART_CLUSTER = {
  top: { cx: 512, cy: 312, scaleActive: 0.352, scaleIdle: 0.332 },
  left: { cx: 374, cy: 488, scaleActive: 0.308, scaleIdle: 0.288 },
  right: { cx: 650, cy: 488, scaleActive: 0.308, scaleIdle: 0.288 },
} as const