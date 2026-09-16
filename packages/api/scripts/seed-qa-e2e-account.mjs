/**
 * Garante compliance aceito para conta qa.e2e (sem alterar perfil self).
 *   node packages/api/scripts/seed-qa-e2e-account.mjs
 */
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync, existsSync } from 'fs'
import pg from 'pg'
import { config } from 'dotenv'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const email = 'qa.e2e@aiyracare.local'

function readE2eEmail() {
  const e2ePath = resolve(root, 'packages/web/.env.e2e.local')
  if (!existsSync(e2ePath)) return null
  for (const line of readFileSync(e2ePath, 'utf8').split('\n')) {
    if (line.startsWith('QA_TEST_EMAIL=')) {
      return line.slice('QA_TEST_EMAIL='.length).trim()
    }
  }
  return null
}

const lookupEmail = readE2eEmail() || email

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL não definido')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const client = await pool.connect()

try {
  const { rows } = await client.query(
    `SELECT id FROM app_accounts WHERE auth_provider = 'supabase' AND lower(email) = lower($1)`,
    [lookupEmail],
  )
  if (rows.length === 0) {
    console.log('app_account ausente — faça login uma vez com', lookupEmail)
    process.exit(0)
  }
  const accountId = rows[0].id
  await client.query(
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
  const { rows: self } = await client.query(
    `SELECT 1 FROM patient_memberships WHERE account_id = $1 AND role = 'self' LIMIT 1`,
    [accountId],
  )
  console.log('seed-qa-e2e OK', accountId, self.length ? '(com perfil self)' : '(sem perfil — complete onboarding)')
} finally {
  client.release()
  await pool.end()
}
