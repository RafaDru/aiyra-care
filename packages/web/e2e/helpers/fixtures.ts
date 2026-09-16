/** CPF único por execução (validação UI: 11 dígitos). */
export function uniqueQaCpf(seed = Date.now()): string {
  const raw = String(91000000000 + (seed % 899999999)).padStart(11, '0').slice(0, 11)
  return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9)}`
}

export function qaPatientName(kind: 'adult' | 'minor', suffix = Date.now()): string {
  return kind === 'adult' ? `QA-Adulto-${suffix}` : `QA-Menor-${suffix}`
}
