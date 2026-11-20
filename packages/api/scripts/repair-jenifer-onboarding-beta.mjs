/**
 * Notebook repair — Jenifer beta onboarding (jenifercristinejsc@gmail.com).
 *
 * Sintoma: login Google criou app_account duplicado; complete-profile falhou com CPF_ALREADY_LINKED.
 *
 * Uso (com DATABASE_URL do notebook):
 *   node packages/api/scripts/repair-jenifer-onboarding-beta.mjs
 *   node packages/api/scripts/repair-jenifer-onboarding-beta.mjs --sub=<supabase-user-uuid>
 *
 * Opcional --sub: auth.users.id atual do Google; sem isso, apenas lista duplicatas e sugere relink manual.
 */
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { config } from 'dotenv'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const EMAIL = 'jenifercristinejsc@gmail.com'
const subArg = process.argv.find((a) => a.startsWith('--sub='))?.slice('--sub='.length)?.trim()

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL não definido')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

const { rows: accounts } = await pool.query(
  `SELECT a.id, a.auth_subject::text, a.email, a.display_name, a.created_at,
          (SELECT p.id FROM patient_memberships m
            JOIN patients p ON p.id = m.patient_id
           WHERE m.account_id = a.id AND m.role = 'self' LIMIT 1) AS self_patient_id,
          (SELECT p.cpf FROM patient_memberships m
            JOIN patients p ON p.id = m.patient_id
           WHERE m.account_id = a.id AND m.role = 'self' LIMIT 1) AS self_cpf
   FROM app_accounts a
   WHERE a.auth_provider = 'supabase' AND lower(a.email) = lower($1)
   ORDER BY a.created_at ASC`,
  [EMAIL],
)

if (accounts.length === 0) {
  console.error('Nenhuma app_account para', EMAIL)
  await pool.end()
  process.exit(1)
}

console.log('Contas para', EMAIL)
for (const row of accounts) {
  console.log(' -', row.id, 'subject=', row.auth_subject, 'self=', row.self_patient_id ?? '(nenhum)', 'cpf=', row.self_cpf ?? '-')
}

const canonical =
  accounts.find((r) => r.self_cpf && String(r.self_cpf).replace(/\D/g, '').length === 11) ??
  accounts.find((r) => r.self_patient_id) ??
  accounts[0]

if (!subArg) {
  console.log('\nCanonical sugerida:', canonical.id)
  console.log('Re-rode com --sub=<uuid do Supabase Auth (Google)> para relink auth_subject.')
  await pool.end()
  process.exit(0)
}

const duplicates = accounts.filter((r) => r.id !== canonical.id)
const client = await pool.connect()

try {
  await client.query('BEGIN')
  for (const dup of duplicates) {
    await client.query(
      `UPDATE app_accounts SET auth_subject = 'replaced-' || id::text, updated_at = NOW() WHERE id = $1`,
      [dup.id],
    )
    console.log('Retired duplicate account', dup.id)
  }
  await client.query(
    `UPDATE app_accounts
     SET auth_subject = 'replaced-' || id::text, updated_at = NOW()
     WHERE auth_provider = 'supabase' AND auth_subject = $1::uuid AND id != $2`,
    [subArg, canonical.id],
  )
  const { rowCount } = await client.query(
    `UPDATE app_accounts SET auth_subject = $1::uuid, updated_at = NOW() WHERE id = $2`,
    [subArg, canonical.id],
  )
  if (rowCount === 0) throw new Error('Canonical account not updated')
  await client.query('COMMIT')
  console.log('OK — canonical', canonical.id, 'relinked to subject', subArg)
  console.log('Peça para Jenifer recarregar o app (logout/login se ainda estiver no onboarding).')
} catch (err) {
  await client.query('ROLLBACK')
  console.error(err)
  process.exitCode = 1
} finally {
  client.release()
  await pool.end()
}