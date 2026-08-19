import type { Vaccine } from '../vaccine/vaccine.entity.js'
import { conferVaccineRecord } from '../../application/vaccine/vaccine-conference.service.js'
import { isVaccineHygieneDuplicate } from './vaccine-notes.js'

export interface VaccineDuplicateCandidate {
  vaccineA: Vaccine
  vaccineB: Vaccine
  detector: string
  score: number
  evidence: Record<string, unknown>
}

function norm(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function orderedPair<T>(a: T, b: T): [T, T] {
  return a < b ? [a, b] : [b, a]
}

type ConferenceSnapshot = {
  catalogSlotKey: string | null
  catalogId: string | null
  doseNumber: number
}

function conferenceFor(vaccine: Vaccine, birthDate?: string | null): ConferenceSnapshot {
  const appDate = vaccine.applicationDate instanceof Date
    ? vaccine.applicationDate.toISOString().slice(0, 10)
    : String(vaccine.applicationDate).slice(0, 10)
  const c = conferVaccineRecord({
    vaccineName: vaccine.vaccineName,
    doseNumber: vaccine.doseNumber,
    applicationDate: appDate,
    birthDate,
  })
  return {
    catalogSlotKey: c.catalogSlotKey,
    catalogId: c.catalogId,
    doseNumber: c.doseNumber,
  }
}

/** Compara duas vacinas do mesmo paciente; retorna candidato ou null. */
export function detectVaccineDuplicatePair(
  vaccineA: Vaccine,
  vaccineB: Vaccine,
  birthDate?: string | null,
): VaccineDuplicateCandidate | null {
  if (vaccineA.patientId !== vaccineB.patientId) return null
  if (vaccineA.id === vaccineB.id) return null
  if (isVaccineHygieneDuplicate(vaccineA) || isVaccineHygieneDuplicate(vaccineB)) return null

  const sameDate = dateKey(vaccineA.applicationDate) === dateKey(vaccineB.applicationDate)
  if (!sameDate) return null

  const confA = conferenceFor(vaccineA, birthDate)
  const confB = conferenceFor(vaccineB, birthDate)

  if (confA.catalogSlotKey && confB.catalogSlotKey && confA.catalogSlotKey === confB.catalogSlotKey) {
    return {
      vaccineA,
      vaccineB,
      detector: 'vaccine_catalog_slot',
      score: 96,
      evidence: {
        catalogSlotKey: confA.catalogSlotKey,
        applicationDate: dateKey(vaccineA.applicationDate),
      },
    }
  }

  if (
    confA.catalogId
    && confB.catalogId
    && confA.catalogId === confB.catalogId
    && confA.doseNumber === confB.doseNumber
  ) {
    return {
      vaccineA,
      vaccineB,
      detector: 'vaccine_date_catalog_dose',
      score: 92,
      evidence: {
        catalogId: confA.catalogId,
        doseNumber: confA.doseNumber,
        applicationDate: dateKey(vaccineA.applicationDate),
      },
    }
  }

  const nameA = norm(vaccineA.vaccineName)
  const nameB = norm(vaccineB.vaccineName)
  if (nameA && nameB && nameA === nameB) {
    return {
      vaccineA,
      vaccineB,
      detector: 'vaccine_date_name',
      score: 90,
      evidence: {
        vaccineName: vaccineA.vaccineName,
        applicationDate: dateKey(vaccineA.applicationDate),
      },
    }
  }

  if (confA.catalogId && confB.catalogId && confA.catalogId === confB.catalogId) {
    return {
      vaccineA,
      vaccineB,
      detector: 'vaccine_date_catalog',
      score: 85,
      evidence: {
        catalogId: confA.catalogId,
        applicationDate: dateKey(vaccineA.applicationDate),
        nameA: vaccineA.vaccineName,
        nameB: vaccineB.vaccineName,
      },
    }
  }

  return null
}

export function findVaccineDuplicateCandidates(
  vaccines: Vaccine[],
  birthDate?: string | null,
  minScore = 75,
): VaccineDuplicateCandidate[] {
  const out: VaccineDuplicateCandidate[] = []
  const seen = new Set<string>()

  for (let i = 0; i < vaccines.length; i++) {
    for (let j = i + 1; j < vaccines.length; j++) {
      const hit = detectVaccineDuplicatePair(vaccines[i], vaccines[j], birthDate)
      if (!hit || hit.score < minScore) continue
      const [idA, idB] = orderedPair(hit.vaccineA.id, hit.vaccineB.id)
      const key = `${idA}:${idB}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(hit)
    }
  }

  return out.sort((a, b) => b.score - a.score)
}
