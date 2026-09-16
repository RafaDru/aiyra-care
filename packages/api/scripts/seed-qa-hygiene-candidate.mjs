/**
 * Massa E2E — candidato de higienização (duplicata de exames) para conta qa.e2e.
 *   npm run qa:seed-hygiene-candidate
 *   npm run qa:seed-hygiene-candidate -- --reset
 */
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync, existsSync } from 'fs'
import { randomUUID } from 'crypto'
import pg from 'pg'
import { config } from 'dotenv'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const reset = process.argv.includes('--reset')

function readE2eEmail() {
  const e2ePath = resolve(root, 'packages/web/.env.e2e.local')
  if (!existsSync(e2ePath)) return 'qa.e2e@aiyracare.local'
  for (const line of readFileSync(e2ePath, 'utf8').split('\n')) {
    if (line.startsWith('QA_TEST_EMAIL=')) {
      return line.slice('QA_TEST_EMAIL='.length).trim()
    }
  }
  return 'qa.e2e@aiyracare.local'
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL não definido')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const client = await pool.connect()

try {
  const email = readE2eEmail()
  const { rows: accounts } = await client.query(
    `SELECT id FROM app_accounts WHERE auth_provider = 'supabase' AND lower(email) = lower($1)`,
    [email],
  )
  if (accounts.length === 0) {
    console.log('app_account ausente — faça login com', email)
    process.exit(0)
  }
  const accountId = accounts[0].id

  const patientName = 'QA-Hygiene-E2E'
  let patientId

  const { rows: existingPatients } = await client.query(
    `SELECT id FROM patients WHERE owner_account_id = $1 AND name = $2 LIMIT 1`,
    [accountId, patientName],
  )

  if (existingPatients.length > 0) {
    patientId = existingPatients[0].id
  } else {
    patientId = randomUUID()
    const cpfDigits = String(91000000000 + (Date.now() % 899999999)).padStart(11, '0').slice(0, 11)
    await client.query(
      `INSERT INTO patients (id, name, birth_date, gender, owner_account_id, cpf)
       VALUES ($1, $2, '1990-01-15', 'female', $3, $4)`,
      [patientId, patientName, accountId, cpfDigits],
    )
    await client.query(
      `INSERT INTO patient_memberships (account_id, patient_id, role)
       VALUES ($1, $2, 'guardian') ON CONFLICT DO NOTHING`,
      [accountId, patientId],
    )
  }

  if (reset) {
    await client.query(
      `DELETE FROM hygiene_candidates WHERE account_id = $1 AND detector = 'e2e_playwright'`,
      [accountId],
    )
    await client.query(
      `DELETE FROM exams WHERE patient_id = $1 AND exam_type LIKE 'QA-Hygiene-%'`,
      [patientId],
    )
  }

  const examA = randomUUID()
  const examB = randomUUID()
  const [entityIdA, entityIdB] = examA < examB ? [examA, examB] : [examB, examA]

  await client.query(
    `INSERT INTO exams (id, patient_id, exam_type, exam_date, result_summary, source)
     VALUES ($1, $2, 'QA-Hygiene-Exame-A', CURRENT_DATE - 30, 'Resultado A', 'manual'),
            ($3, $2, 'QA-Hygiene-Exame-B', CURRENT_DATE - 29, 'Resultado B', 'manual')
     ON CONFLICT (id) DO NOTHING`,
    [examA, patientId, examB],
  )

  await client.query(
    `INSERT INTO hygiene_candidates (
       account_id, patient_id, entity_type, entity_id_a, entity_id_b, detector, score, evidence
     ) VALUES ($1, $2, 'exam', $3, $4, 'e2e_playwright', 88, '{"examType":"Hemograma"}'::jsonb)
     ON CONFLICT (entity_type, entity_id_a, entity_id_b)
     DO UPDATE SET status = 'pending', account_id = EXCLUDED.account_id, updated_at = NOW()
     WHERE hygiene_candidates.detector = 'e2e_playwright'`,
    [accountId, patientId, entityIdA, entityIdB],
  )

  console.log('qa-hygiene-candidate OK', { accountId, patientId, entityIdA, entityIdB })
} finally {
  client.release()
  await pool.end()
}
