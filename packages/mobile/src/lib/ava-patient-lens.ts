import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Patient } from './api.types'

const LAST_PATIENT_KEY = 'ava:lastPatientId'

export async function readAvaLastPatientId(): Promise<string | null> {
  try {
    const v = await AsyncStorage.getItem(LAST_PATIENT_KEY)
    return v && v.length > 0 ? v : null
  } catch {
    return null
  }
}

export async function writeAvaLastPatientId(patientId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_PATIENT_KEY, patientId)
  } catch {
    /* ignore */
  }
}

/** Resolve lente quando não há override explícito na UI. */
export function resolveAvaPatientLens(
  patients: Patient[],
  routePatientId: string | null | undefined,
  lastPatientId: string | null,
): string | null {
  if (routePatientId && patients.some((p) => p.id === routePatientId)) {
    return routePatientId
  }
  if (lastPatientId && patients.some((p) => p.id === lastPatientId)) return lastPatientId
  const self = patients.find((p) => p.isSelf)
  if (self) return self.id
  return patients[0]?.id ?? null
}
