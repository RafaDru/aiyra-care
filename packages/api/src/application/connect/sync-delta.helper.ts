import type { Pool } from 'pg'
import type { IntegrationLink } from '../../domain/integration-link/integration-link.entity.js'

const MATER_DEI_DEFAULT_START = '2015-01-01'
const MATER_DEI_LOOKBACK_DAYS = 14
const MATER_DEI_FIRST_SYNC_DAYS = 365

/** Meses de extrato no sync manual (full). */
export const UNIMED_EXTRATO_MONTHS_FULL = 6
/** Meses de extrato no sync silencioso/incremental. */
export const UNIMED_EXTRATO_MONTHS_INCREMENTAL = 2
const UNIMED_LOOKBACK_DAYS = 14

/** Meses de guias/tokens Amil no sync manual (full). */
export const AMIL_GUIAS_MONTHS_FULL = 12
/** Meses de guias no sync silencioso/incremental. */
export const AMIL_GUIAS_MONTHS_INCREMENTAL = 2
const AMIL_LOOKBACK_DAYS = 14

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

/** Janela de competências do extrato Unimed (sync silencioso = menos meses). */
export function computeUnimedExtratoMonths(incremental: boolean): number {
  return incremental ? UNIMED_EXTRATO_MONTHS_INCREMENTAL : UNIMED_EXTRATO_MONTHS_FULL
}

/**
 * Autorizações com emissão/validade antes desta data usam só dados da lista (sem detalhe).
 * null = detalhar todas (sync manual).
 */
export function computeUnimedAuthorizationSince(
  link: IntegrationLink,
  incremental: boolean,
): Date | null {
  if (!incremental) return null
  const lastSync = link.lastSyncAt
  if (lastSync) return subtractDays(lastSync, UNIMED_LOOKBACK_DAYS)
  const fallback = new Date()
  fallback.setMonth(fallback.getMonth() - UNIMED_EXTRATO_MONTHS_INCREMENTAL)
  return fallback
}

/** Início do período PostTokens (guias Amil). Sync silencioso = janela curta. */
export function computeAmilGuidesPeriodStart(link: IntegrationLink, incremental: boolean): Date {
  if (!incremental) {
    const start = new Date()
    start.setMonth(start.getMonth() - AMIL_GUIAS_MONTHS_FULL)
    return start
  }
  if (link.lastSyncAt) return subtractDays(link.lastSyncAt, AMIL_LOOKBACK_DAYS)
  const start = new Date()
  start.setMonth(start.getMonth() - AMIL_GUIAS_MONTHS_INCREMENTAL)
  return start
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
