import type { PatientContext } from '../../application/patient/patient-context.types.js'

interface CachedContext {
  generation: string
  timelineMonths: number | undefined
  body: PatientContext
}

const store = new Map<string, CachedContext>()

function cacheKey(patientId: string, timelineMonths: number | undefined): string {
  return `${patientId}:${timelineMonths ?? 'default'}`
}

export function getCachedPatientContext(
  patientId: string,
  generation: string,
  timelineMonths: number | undefined,
): PatientContext | null {
  const entry = store.get(cacheKey(patientId, timelineMonths))
  if (!entry || entry.generation !== generation) return null
  return entry.body
}

export function setCachedPatientContext(
  patientId: string,
  generation: string,
  timelineMonths: number | undefined,
  body: PatientContext,
): void {
  store.set(cacheKey(patientId, timelineMonths), {
    generation,
    timelineMonths,
    body,
  })
}
