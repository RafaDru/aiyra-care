import type { Patient } from '../lib/api.types.js'
import { DESIGN_FIXTURE_PATIENT_ID } from '../lib/design-preview-env.js'

const now = '2026-11-27T12:00:00.000Z'

function fixturePatient(
  id: string,
  name: string,
  gender: 'male' | 'female',
  birthDate: string,
): Patient {
  return {
    id,
    name,
    birthDate,
    gender,
    bloodType: null,
    weightKg: null,
    heightCm: null,
    photoUrl: null,
    parentIds: [],
    cpf: null,
    cns: null,
    ageCategory: 'children',
    createdAt: now,
    updatedAt: now,
    isOwner: false,
  }
}

/** Alinhado ao espelho Canvas S3 (chip Bruno, família demo). */
export const DESIGN_PATIENT_BRUNO = fixturePatient(
  DESIGN_FIXTURE_PATIENT_ID,
  'Bruno',
  'male',
  '2018-03-15',
)

export const DESIGN_PATIENT_FAMILY: Patient[] = [
  DESIGN_PATIENT_BRUNO,
  fixturePatient('design-fixture-sofia', 'Sofia', 'female', '2020-07-01'),
  fixturePatient('design-fixture-helena', 'Helena', 'female', '2015-11-20'),
]