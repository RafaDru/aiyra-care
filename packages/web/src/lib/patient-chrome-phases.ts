/** Scroll expandido → recolhido: (1) macro/menu ao sticky; (2) lockup→orb — perfil não compacta. */
export const CHROME_MACRO_COMPACT_BY = 0.44
export const CHROME_HEADER_COLLAPSE_START = 0.4

export function easeChromeProgress(raw: number): number {
  const c = Math.max(0, Math.min(1, raw))
  return c * c * (3 - 2 * c)
}

/**
 * @deprecated Macro usa `macroProgress` do sticky (ver `patient-chrome-scroll.ts`).
 * Mantido para presets estáticos (collapsed S3).
 */
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

/** Macro recolhido S3 — ícone à esquerda + label (oficial 27/11). */
export function chromeMacroCompactLeftIcon(macroProgress: number): boolean {
  return macroProgress >= 0.82
}

/** @deprecated usar chromeMacroCompactLeftIcon */
export function chromeMacroLabelsOnly(progress: number): boolean {
  return chromeMacroCompactLeftIcon(progress)
}