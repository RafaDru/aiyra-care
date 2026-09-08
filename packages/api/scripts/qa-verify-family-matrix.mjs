/**
 * Verifica matriz de grants QA no PG (sem browser).
 *   node packages/api/scripts/qa-verify-family-matrix.mjs
 */
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { config } from 'dotenv'
import {
  QA_JOAO_ACCOUNT_ID,
  QA_MARIA_ACCOUNT_ID,
  QA_FRANCISCO_ACCOUNT_ID,
  QA_VITORIA_ACCOUNT_ID,
  QA_PATIENT_PEDRO_ID,
  QA_PATIENT_LUCAS_ID,
  QA_PATIENT_MARIANA_ID,
  QA_PATIENT_HENRIQUE_ID,
} from './seed-qa-ids.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const EXPECTED = {
  [QA_JOAO_ACCOUNT_ID]: [QA_PATIENT_PEDRO_ID, QA_PATIENT_LUCAS_ID, QA_PATIENT_MARIANA_ID],
  [QA_MARIA_ACCOUNT_ID]: [QA_PATIENT_PEDRO_ID, QA_PATIENT_LUCAS_ID],
  [QA_FRANCISCO_ACCOUNT_ID]: [QA_PATIENT_HENRIQUE_ID],
  [QA_VITORIA_ACCOUNT_ID]: [QA_PATIENT_MARIANA_ID],
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const client = await pool.connect()
let failed = 0

try {
  for (const [accountId, expectedPatients] of Object.entries(EXPECTED)) {
    const { rows } = await client.query(
      `SELECT patient_id FROM patient_access_grants
       WHERE account_id = $1 AND revoked_at IS NULL`,
      [accountId],
    )
    const got = new Set(rows.map((r) => r.patient_id))
    const ok = expectedPatients.every((id) => got.has(id)) && got.size === expectedPatients.length
    const label = Object.entries({
      joao: QA_JOAO_ACCOUNT_ID,
      maria: QA_MARIA_ACCOUNT_ID,
      francisco: QA_FRANCISCO_ACCOUNT_ID,
      vitoria: QA_VITORIA_ACCOUNT_ID,
    }).find(([, id]) => id === accountId)?.[0]
    console.log(`[${ok ? 'OK' : 'FAIL'}] ${label} — esperado ${expectedPatients.length} grants, got ${got.size}`)
    if (!ok) failed++
  }
  process.exit(failed > 0 ? 1 : 0)
} finally {
  client.release()
  await pool.end()
}
