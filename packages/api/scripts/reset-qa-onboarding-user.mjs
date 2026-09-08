/**
 * Repõe conta QA de onboarding (perfil self + re-seed compliance para E2E).
 *   npm run qa:reset-onboarding-user
 *   npm run qa:reset-onboarding-user -- --keep-compliance
 */
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync, existsSync } from 'fs'
import pg from 'pg'
import { config } from 'dotenv'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

function readE2eAuthSubject() {
  const e2ePath = resolve(root, 'packages/web/.env.e2e.local')
  if (!existsSync(e2ePath)) return null
  for (const line of readFileSync(e2ePath, 'utf8').split('\n')) {
    if (line.startsWith('QA_ONBOARDING_AUTH_SUBJECT=')) {
      return line.slice('QA_ONBOARDING_AUTH_SUBJECT='.length).trim()
    }
  }
  return null
}

const email =
  process.argv.find((a) => a.startsWith('--email='))?.slice('--email='.length) ??
  'qa.onboarding@aiyracare.local'
const authSubject =
  process.argv.find((a) => a.startsWith('--sub='))?.slice('--sub='.length) ??
  process.env.QA_ONBOARDING_AUTH_SUBJECT ??
  readE2eAuthSubject()
const keepCompliance = process.argv.includes('--keep-compliance')

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL não definido')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const client = await pool.connect()

try {
  const { rows: accounts } = authSubject
    ? await client.query(
        `SELECT id, email FROM app_accounts WHERE auth_provider = 'supabase' AND auth_subject = $1`,
        [authSubject],
      )
    : await client.query(
        `SELECT id, email FROM app_accounts WHERE auth_provider = 'supabase' AND lower(email) = lower($1)`,
        [email],
      )

  if (accounts.length === 0) {
    console.log('Nenhuma app_account — OK (primeiro login cria via /auth/sync).')
    process.exit(0)
  }

  const accountId = accounts[0].id
  console.log('Reset onboarding:', accounts[0].email, accountId)

  const { rows: selfRows } = await client.query(
    `SELECT patient_id FROM patient_memberships WHERE account_id = $1 AND role = 'self'`,
    [accountId],
  )
  for (const { patient_id: patientId } of selfRows) {
    await client.query(`DELETE FROM patient_memberships WHERE account_id = $1 AND patient_id = $2`, [
      accountId,
      patientId,
    ])
    await client.query(`DELETE FROM patients WHERE id = $1 AND owner_account_id = $2`, [patientId, accountId])
    console.log('  paciente self removido:', patientId)
  }

  if (!keepCompliance) {
    await client.query(`DELETE FROM legal_document_acceptances WHERE account_id = $1`, [accountId])
    const { rowCount } = await client.query(
      `INSERT INTO legal_document_acceptances (
         account_id, document_id, document_kind, document_version, content_sha256
       )
       SELECT $1, id, kind, version, content_sha256
       FROM legal_documents
       WHERE is_current = true
         AND requires_acceptance = true
         AND kind IN ('terms_of_use', 'privacy_policy')
       ON CONFLICT (account_id, document_id) DO NOTHING`,
      [accountId],
    )
    console.log('  compliance re-seed:', rowCount ?? 0)
  }

  console.log('\nPronto: needsProfile=true; E2E pula gate UI de compliance.')
} finally {
  client.release()
  await pool.end()
}
