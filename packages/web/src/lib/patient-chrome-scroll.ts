import { easeChromeProgress } from './patient-chrome-phases.js'

/** Janela de scroll para fase header (hero + lockup→orb). */
export const CHROME_SCROLL_RANGE = 152

/** Distância (px) com macro já sticky até S3 ícone-esquerda. */
export const CHROME_MACRO_STICKY_RANGE = 88

export function readCompactChromeHeaderStickyHeightPx(): number {
  if (typeof document === 'undefined') return 64
  const header = document.querySelector('.app-header--compact-brand')
  if (header) {
    const h = header.getBoundingClientRect().height
    if (h > 0) return h
  }
  return 64
}

export type PatientChromeScrollSample = {
  progress: number
  macroProgress: number
}

/** progress = header/hero; macroProgress só após colisão sticky macro ↔ faixa do header. */
export function samplePatientChromeFromViewport(): PatientChromeScrollSample {
  const scrollY = window.scrollY
  const progress = easeChromeProgress(Math.min(1, Math.max(0, scrollY / CHROME_SCROLL_RANGE)))

  const headerH = readCompactChromeHeaderStickyHeightPx()
  const sentinel = document.querySelector<HTMLElement>('[data-patient-chrome-macro-sentinel]')
  let macroProgress = 0
  if (sentinel) {
    const top = sentinel.getBoundingClientRect().top
    if (top <= headerH) {
      macroProgress = easeChromeProgress(
        Math.min(1, Math.max(0, (headerH - top) / CHROME_MACRO_STICKY_RANGE)),
      )
    }
  }

  return { progress, macroProgress }
}