/** IDs alinhados a `FLEURY_LAB_BRANDS` na web e `FLEURY_PRECISION_MARCA_PROFILES`. */
export type FleuryLabBrandId = 'pardini' | 'fleury' | 'a_mais' | 'labs_a'

const RULES: Array<{ id: FleuryLabBrandId; patterns: RegExp[] }> = [
  { id: 'labs_a', patterns: [/labs\s*a\s*\+/i, /labsa/i, /labs\s*a\+/i] },
  { id: 'a_mais', patterns: [/a\+/i, /a\s*mais/i, /amais/i, /medicina\s*diagnóstica/i] },
  { id: 'pardini', patterns: [/pardini/i, /hermes/i, /grupo\s*pardini/i] },
  { id: 'fleury', patterns: [/fleury/i, /grupo\s*fleury/i] },
]

/** Infere marca do ecossistema a partir de `nomeUnidade` / laboratory. */
export function inferFleuryLabBrandId(laboratory: string | null | undefined): FleuryLabBrandId | null {
  const text = (laboratory ?? '').trim()
  if (!text) return null
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(text))) return rule.id
  }
  return null
}
