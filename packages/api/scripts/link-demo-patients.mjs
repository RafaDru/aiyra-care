/**
 * Vincula Lucas/Ana demo à conta Supabase já existente no PG (útil no preview).
 *
 *   $env:DATABASE_URL = "postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare_preview"
 *   node scripts/link-demo-patients.mjs --sub=<seu-supabase-user-id>
 *
 * Obtenha o sub: login em :5174 → DevTools → Application → localStorage supabase auth token → user.id
 */
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { config } from 'dotenv'
import { PATIENT_ANA_ID, PATIENT_LUCAS_ID } from './seed-demo-ids.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })
config({ path: resolve(root, '.env.preview'), override: true })

const subArg = process.argv.find((a) => a.startsWith('--sub='))
const authSubject = subArg?.slice('--sub='.length) ?? process.env.AUTH_SUBJECT

if (!authSubject) {
  console.error('Uso: node scripts/link-demo-patients.mjs --sub=<supabase-user-uuid>')
  console.error('  ou AUTH_SUBJECT=<uuid> node scripts/link-demo-patients.mjs')
  process.exit(1)
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL não definido')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const client = await pool.connect()

try {
  const { rows } = await client.query(
    `SELECT id, email, display_name FROM app_accounts WHERE auth_provider = 'supabase' AND auth_subject = $1`,
    [authSubject],
  )
  if (rows.length === 0) {
    console.error('Conta não encontrada para auth_subject:', authSubject)
    console.error('Faça login uma vez em http://localhost:5174 (preview) e repita.')
    process.exit(1)
  }
  const account = rows[0]
  for (const patientId of [PATIENT_LUCAS_ID, PATIENT_ANA_ID]) {
    await client.query(
      `INSERT INTO patient_memberships (account_id, patient_id, role)
       VALUES ($1, $2, 'guardian')
       ON CONFLICT (account_id, patient_id) DO NOTHING`,
      [account.id, patientId],
    )
    try {
      await client.query(
        `INSERT INTO patient_access_grants (patient_id, account_id, membership_role, access_level, granted_by)
         VALUES ($1, $2, 'guardian', 'full', $2)
         ON CONFLICT (patient_id, account_id)
         DO UPDATE SET revoked_at = NULL, updated_at = NOW()`,
        [patientId, account.id],
      )
    } catch (e) {
      if (e.code !== '42P01') throw e
    }
  }
  console.log('link-demo-patients OK')
  console.log('  account:', account.id, account.email ?? account.display_name)
  console.log('  patients: Lucas + Ana demo visíveis após reload em :5174')
} finally {
  client.release()
  await pool.end()
}
