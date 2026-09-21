/**
 * Referências opacas de navegação (sessão do app) — não substituem UUID na API.
 * Evita expor chaves Postgres na barra de URL / deep links casuais.
 * Roadmap: tokens de sessão no BFF (ver docs/features/mobile-app-shell.md).
 */
const refToId = new Map<string, string>()
const idToRef = new Map<string, string>()

function randomRefSuffix(): string {
  const bytes = new Uint8Array(8)
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function refForPatient(patientId: string): string {
  const existing = idToRef.get(patientId)
  if (existing) return existing
  const ref = `p_${randomRefSuffix()}`
  idToRef.set(patientId, ref)
  refToId.set(ref, patientId)
  return ref
}

export function patientIdFromRouteParam(param: string): string | null {
  if (!param) return null
  if (refToId.has(param)) return refToId.get(param) ?? null
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(param)) {
    return param
  }
  return null
}

export function primePatientRefs(patients: { id: string }[]): void {
  for (const p of patients) refForPatient(p.id)
}
