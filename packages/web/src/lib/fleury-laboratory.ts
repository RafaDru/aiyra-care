import {
  FLEURY_LAB_BRANDS,
  type FleuryLabBrand,
} from '../components/brands/fleury-group-config.js'

export type FleuryLabBrandId = FleuryLabBrand['id']

const RULES: Array<{ id: FleuryLabBrandId; patterns: RegExp[] }> = [
  { id: 'labs_a', patterns: [/labs\s*a\s*\+/i, /labsa/i, /labs\s*a\+/i] },
  { id: 'a_mais', patterns: [/a\+/i, /a\s*mais/i, /amais/i, /medicina\s*diagnóstica/i] },
  { id: 'pardini', patterns: [/pardini/i, /hermes/i, /grupo\s*pardini/i] },
  { id: 'fleury', patterns: [/fleury/i, /grupo\s*fleury/i] },
]

export const FLEURY_PRECISION_SOURCES = new Set(['hermes_pardini'])

export function isFleuryPrecisionSource(source: string | null | undefined): boolean {
  return source != null && FLEURY_PRECISION_SOURCES.has(source)
}

export function inferFleuryLabBrandId(laboratory: string | null | undefined): FleuryLabBrandId | null {
  const text = (laboratory ?? '').trim()
  if (!text) return null
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(text))) return rule.id
  }
  return null
}

export function fleuryLabBrandById(id: FleuryLabBrandId | null | undefined): FleuryLabBrand | undefined {
  if (!id) return undefined
  return FLEURY_LAB_BRANDS.find((b) => b.id === id)
}

export function parseHermesExamNotesMeta(notes: string | null | undefined): {
  fleuryLabBrand?: FleuryLabBrandId
} {
  if (!notes?.includes('\n')) return {}
  try {
    const meta = JSON.parse(notes.slice(notes.indexOf('\n') + 1)) as { fleuryLabBrand?: string }
    const id = meta.fleuryLabBrand
    if (id === 'pardini' || id === 'fleury' || id === 'a_mais' || id === 'labs_a') {
      return { fleuryLabBrand: id }
    }
  } catch {
    // not JSON meta
  }
  return {}
}

export function resolveFleuryLabBrand(
  source: string | null | undefined,
  laboratory: string | null | undefined,
  notes?: string | null,
): FleuryLabBrand | null {
  if (!isFleuryPrecisionSource(source)) return null
  const fromNotes = parseHermesExamNotesMeta(notes).fleuryLabBrand
  const id = fromNotes ?? inferFleuryLabBrandId(laboratory)
  return fleuryLabBrandById(id) ?? null
}

/** Unidade/local após remover o nome da marca (ex. «Belo Horizonte — Centro»). */
export function fleuryLaboratoryDetail(
  laboratory: string | null | undefined,
  brand: FleuryLabBrand | null,
): string | null {
  const raw = (laboratory ?? '').trim()
  if (!raw) return null
  if (!brand) return raw

  let detail = raw
  for (const token of [brand.label, brand.shortLabel]) {
    const re = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    detail = detail.replace(re, '')
  }
  detail = detail.replace(/^[\s\-–—|·,]+|[\s\-–—|·,]+$/g, '').trim()
  if (!detail || detail.toLowerCase() === brand.label.toLowerCase()) return null
  return detail
}
