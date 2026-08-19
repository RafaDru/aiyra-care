/**
 * Varredura de higienização (exames duplicados).
 * Usage: npx tsx packages/api/scripts/run-hygiene-scan.ts [patientId]
 */
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import {
  runHygieneScanAll,
  runHygieneScanForPatient,
} from '../src/application/hygiene/hygiene-scan.helper.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/openhealth',
})

const patientId = process.argv[2]

if (patientId) {
  const n = await runHygieneScanForPatient(pool, patientId)
  console.log(`Patient ${patientId}: ${n} candidate pair(s) upserted`)
} else {
  const r = await runHygieneScanAll(pool)
  console.log(`Scanned ${r.patients} patient(s), ${r.candidates} candidate upsert(s)`)
}

await pool.end()
