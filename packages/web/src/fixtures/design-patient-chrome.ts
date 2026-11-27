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

export type DesignClinicalHistoryRow = {
  name: string
  meta: string
  pill: string
  ok: boolean
}

/** Fixture «Resumo do histórico» — scroll longo S3 / bottom nav (Bruno, só design routes). */
export const DESIGN_CLINICAL_HISTORY_ROWS: DesignClinicalHistoryRow[] = [
  { name: 'Hepatite B', meta: '3ª dose · ago/2024', pill: 'Em dia', ok: true },
  { name: 'Tríplice viral (SCR)', meta: 'Última dose há 9 anos', pill: 'Verificar', ok: false },
  { name: 'Consulta pediatria', meta: '12/11/2025 · rotina 8 anos', pill: 'Realizada', ok: true },
  { name: 'Hemograma completo', meta: '28/10/2025 · lab Mater', pill: 'Normal', ok: true },
  { name: 'Otite média', meta: '03/09/2025 · PA infantil', pill: 'Alta', ok: true },
  { name: 'DTPa reforço', meta: '15/08/2025 · SUS', pill: 'Agendada', ok: false },
  { name: 'Curva de crescimento', meta: '12/11/2025 · percentil 50', pill: 'OK', ok: true },
  { name: 'RX tórax', meta: '20/06/2025 · tosse persistente', pill: 'Sem alteração', ok: true },
  { name: 'Gripe sazonal', meta: '22/04/2025', pill: 'Em dia', ok: true },
  { name: 'Odontopediatria', meta: '10/03/2025 · check-up', pill: 'Preventivo', ok: true },
  { name: 'Plano asma', meta: '18/01/2025 · revisão', pill: 'Atualizado', ok: true },
  { name: 'COVID-19 reforço', meta: '05/12/2024', pill: 'Em dia', ok: true },
]