/** Scroll expandido → recolhido: (1) macro/menu, (2) perfil + lockup. */
export const CHROME_MACRO_COMPACT_BY = 0.44
export const CHROME_HEADER_COLLAPSE_START = 0.4

/** 0→1 enquanto o macro compacta (primeira fase). */
export function chromeMacroPhase(progress: number): number {
  const t = progress / CHROME_MACRO_COMPACT_BY
  return Math.max(0, Math.min(1, t))
}

/** 0→1 enquanto hero/lockup recolhem (segunda fase). */
export function chromeHeaderPhase(progress: number): number {
  const span = 1 - CHROME_HEADER_COLLAPSE_START
  if (span <= 0) return progress >= 1 ? 1 : 0
  return Math.max(0, Math.min(1, (progress - CHROME_HEADER_COLLAPSE_START) / span))
}

export function chromeMacroLabelsOnly(progress: number): boolean {
  return chromeMacroPhase(progress) >= 0.82
}