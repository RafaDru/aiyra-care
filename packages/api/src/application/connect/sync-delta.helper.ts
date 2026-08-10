import type { Pool } from 'pg'
import type { IntegrationLink } from '../../domain/integration-link/integration-link.entity.js'

const MATER_DEI_DEFAULT_START = '2015-01-01'
const MATER_DEI_LOOKBACK_DAYS = 14
const MATER_DEI_FIRST_SYNC_DAYS = 365

function formatDateYmd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function subtractDays(d: Date, days: number): Date {
  const out = new Date(d)
  out.setDate(out.getDate() - days)
  return out
}

/**
 * Janela incremental para /patients/exams/search no Mater Dei.
 * Evita re-listar todo o histórico (2015→hoje) em cada sync silencioso.
 */
export async function computeMaterDeiExamStartDate(
  pool: Pool,
  link: IntegrationLink,
  householdPatientIds: string[],
): Promise<string> {
  if (!householdPatientIds.length) return MATER_DEI_DEFAULT_START

  const { rows } = await pool.query<{ max_date: Date | null }>(
    `SELECT MAX(exam_date) AS max_date
     FROM exams
     WHERE source = 'mater_dei' AND patient_id = ANY($1::uuid[])`,
    [householdPatientIds],
  )
  const maxExamDate = rows[0]?.max_date

  if (maxExamDate) {
    const from = subtractDays(maxExamDate, MATER_DEI_LOOKBACK_DAYS)
    return formatDateYmd(from)
  }

  const lastSync = link.lastSyncAt
  if (lastSync) {
    const from = subtractDays(lastSync, MATER_DEI_LOOKBACK_DAYS)
    return formatDateYmd(from)
  }

  const firstSyncFrom = subtractDays(new Date(), MATER_DEI_FIRST_SYNC_DAYS)
  return formatDateYmd(firstSyncFrom)
}

export function collectHouseholdPatientIds(
  linkPatientId: string,
  allPatients: Array<{ id: string; parentIds?: string[] }>,
): string[] {
  const ids = new Set<string>([linkPatientId])
  for (const p of allPatients) {
    if (p.id === linkPatientId) {
      for (const parentId of p.parentIds ?? []) ids.add(parentId)
    }
    if (p.parentIds?.includes(linkPatientId)) ids.add(p.id)
  }
  return [...ids]
}
