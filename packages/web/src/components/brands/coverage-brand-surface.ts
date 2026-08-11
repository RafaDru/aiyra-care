import type { CSSProperties } from 'react'
import { brandOrFallback, type BrandKey } from './brand-config.js'

/** Variáveis CSS para tint de linha na tabela Convênios. */
export function coverageBrandRowVars(brand: BrandKey | string): CSSProperties {
  const meta = brandOrFallback(brand)
  return {
    '--coverage-row-bg': `${meta.color}14`,
    '--coverage-row-bg-hover': `${meta.color}22`,
    '--coverage-brand-color': meta.color,
  } as CSSProperties
}

/** Superfície tint + faixa lateral (detalhe expandido). */
export function coverageBrandSurfaceStyle(brand: BrandKey | string): CSSProperties {
  const meta = brandOrFallback(brand)
  return {
    background: `${meta.color}14`,
    boxShadow: `inset 4px 0 0 ${meta.color}`,
  }
}
