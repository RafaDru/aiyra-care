import type { Patient } from './api.types.js'

const LAST_PATIENT_KEY = 'ava:lastPatientId'

export function readAvaLastPatientId(): string | null {
  try {
    const v = localStorage.getItem(LAST_PATIENT_KEY)
    return v && v.length > 0 ? v : null
  } catch {
    return null
  }
}

export function writeAvaLastPatientId(patientId: string): void {
  try {
    localStorage.setItem(LAST_PATIENT_KEY, patientId)
  } catch {
    /* ignore */
  }
}

export type AvaPatientLensResolveOptions = {
  /**
   * Início sem rota de paciente: titular vê o próprio «Hoje» primeiro;
   * último escolhido no dropdown ainda vale na sessão (override) e em rotas de perfil.
   */
  preferSelfOnHome?: boolean
}

/** Resolve lente quando não há override explícito na UI. */
export function resolveAvaPatientLens(
  patients: Patient[],
  routePatientId: string | null | undefined,
  opts?: AvaPatientLensResolveOptions,
): string | null {
  if (routePatientId && patients.some((p) => p.id === routePatientId)) {
    return routePatientId
  }
  const self = patients.find((p) => p.isSelf)
  if (opts?.preferSelfOnHome && self) return self.id
  const last = readAvaLastPatientId()
  if (last && patients.some((p) => p.id === last)) return last
  if (self) return self.id
  return patients[0]?.id ?? null
}
