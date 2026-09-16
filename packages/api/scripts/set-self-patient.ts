/**
 * Marca um paciente como "self" (titular da conta) para badge "Você" na UI.
 * Uso: npx tsx packages/api/scripts/set-self-patient.ts <patientId> [--email=...]
 */
import { config } from 'dotenv'
import { Pool } from 'pg'
import { PatientMembershipPgRepository } from '../src/infrastructure/persistence/app-account.pg.repository.js'

config()

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

const patientId = process.argv[2]
const emailArg = process.argv.find((a) => a.startsWith('--email='))
const email = emailArg?.slice('--email='.length)

if (!patientId) {
  console.error('Usage: npx tsx packages/api/scripts/set-self-patient.ts <patientId> [--email=account@email]')
  process.exit(1)
}

const memberships = new PatientMembershipPgRepository(pgPool)

let accountId: string | undefined
if (email) {
  const { rows } = await pgPool.query(
    `SELECT id FROM app_accounts WHERE email = $1 LIMIT 1`,
    [email],
  )
  accountId = rows[0]?.id as string | undefined
  if (!accountId) {
    console.error(`No account for email ${email}`)
    process.exit(1)
  }
} else {
  const { rows } = await pgPool.query(
    `SELECT account_id FROM patient_memberships WHERE patient_id = $1 ORDER BY created_at LIMIT 1`,
    [patientId],
  )
  accountId = rows[0]?.account_id as string | undefined
}

if (!accountId) {
  console.error('Could not resolve account_id — pass --email=')
  process.exit(1)
}

await memberships.setSelfPatient(accountId, patientId)
console.log(`OK: patient ${patientId} marked as self for account ${accountId}`)
await pgPool.end()
