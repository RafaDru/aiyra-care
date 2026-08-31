import type { AccountFreshnessView } from './api.types.js'

type SeenMap = Map<string, Record<string, string>>
type Listener = () => void

let state: AccountFreshnessView | null = null
const seen: SeenMap = new Map()
const listeners = new Set<Listener>()

function notifyListeners() {
  listeners.forEach((listener) => listener())
}

export function subscribeAccountFreshness(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getAccountFreshnessState(): AccountFreshnessView | null {
  return state
}

export async function refreshAccountFreshness(): Promise<AccountFreshnessView | null> {
  const { api } = await import('./api.js')
  state = await api.account.freshness()
  notifyListeners()
  return state
}

export function serverGenerationForDomain(
  patientId: string | null,
  domain: string,
): string | null {
  if (!state) return null
  if (!patientId) {
    return state.account.domains[domain]?.generation ?? null
  }
  const patient = state.patients.find((p) => p.patientId === patientId)
  return patient?.domains[domain]?.generation ?? null
}

export function hasNewDomain(patientId: string, domain: string): boolean {
  const serverGen = serverGenerationForDomain(patientId, domain)
  if (!serverGen) return false
  const localSeen = seen.get(patientId)?.[domain]
  return localSeen !== serverGen
}

export function markDomainSeen(patientId: string, domain: string): void {
  const serverGen = serverGenerationForDomain(patientId, domain)
  if (!serverGen) return
  const map = seen.get(patientId) ?? {}
  map[domain] = serverGen
  seen.set(patientId, map)
  notifyListeners()
}

export function clearAccountFreshness(): void {
  state = null
  seen.clear()
  notifyListeners()
}
