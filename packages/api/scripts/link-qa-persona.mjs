/**
 * Vincula seu usuário Supabase (auth_subject) a uma persona da matriz QA.
 *
 *   node packages/api/scripts/link-qa-persona.mjs --persona=joao --sub=<supabase-user-uuid>
 */
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { config } from 'dotenv'
import { QA_PERSONAS } from './seed-qa-ids.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const personaArg = process.argv.find((a) => a.startsWith('--persona='))?.slice('--persona='.length)
const subArg = process.argv.find((a) => a.startsWith('--sub='))?.slice('--sub='.length) ?? process.env.AUTH_SUBJECT

if (!personaArg || !QA_PERSONAS[personaArg]) {
  console.error('Uso: node packages/api/scripts/link-qa-persona.mjs --persona=joao|maria|francisco|vitoria --sub=<uuid>')
  process.exit(1)
}
if (!subArg) {
  console.error('Informe --sub=<supabase-user-uuid>')
  process.exit(1)
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL não definido')
  process.exit(1)
}

const persona = QA_PERSONAS[personaArg]
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const client = await pool.connect()

try {
  await client.query('BEGIN')
  await client.query(
    `UPDATE app_accounts
     SET auth_subject = 'replaced-' || id::text
     WHERE auth_provider = 'supabase' AND auth_subject = $1 AND id != $2`,
    [subArg, persona.accountId],
  )
  const { rowCount } = await client.query(
    `UPDATE app_accounts SET auth_subject = $1, updated_at = NOW() WHERE id = $2`,
    [subArg, persona.accountId],
  )
  if (rowCount === 0) {
    throw new Error(`Conta persona não encontrada: ${persona.accountId}. Rode seed-qa-family-matrix.mjs primeiro.`)
  }
  await client.query('COMMIT')
  console.log(`link-qa-persona OK — persona=${personaArg} account=${persona.accountId}`)
  console.log('  Recarregue o dashboard em :5173')
} catch (e) {
  await client.query('ROLLBACK')
  console.error(e)
  process.exit(1)
} finally {
  client.release()
  await pool.end()
}
