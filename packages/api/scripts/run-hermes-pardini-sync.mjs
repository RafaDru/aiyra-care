import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
dotenv.config({ path: path.join(root, '.env') })
import { decrypt } from '../src/infrastructure/crypto-helper.js'
import pg from 'pg'
import { HermesPardiniSyncScraper } from '../src/infrastructure/scraper/hermes-pardini-sync.scraper.js'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/openhealth',
})

const patientId = 'f3cc72fd-f11c-419e-ac82-3ae45bd313ce'

let login = process.env.HERMES_PARDINI_LOGIN
let password = process.env.HERMES_PARDINI_PASSWORD

if (!login || !password) {
  const linkRow = await pool.query(
    `SELECT id, email, encrypted_password FROM integration_links
     WHERE patient_id = $1 AND portal_type = 'mater_dei' AND active = true
     ORDER BY last_sync_at DESC NULLS LAST LIMIT 1`,
    [patientId],
  )
  if (linkRow.rows.length === 0) {
    console.error('Set HERMES_PARDINI_LOGIN + HERMES_PARDINI_PASSWORD or link mater_dei for fallback')
    process.exit(1)
  }
  login = linkRow.rows[0].email
  password = decrypt(linkRow.rows[0].encrypted_password)
  console.warn('Using Mater Dei credentials as fallback — HP protocol password may differ')
}

console.log('Running Hermes Pardini sync for login:', login)

const scraper = new HermesPardiniSyncScraper()
const result = await scraper.scrape(login, password, (p) => {
  console.log(`[${p.status}] ${p.step}: ${p.message}`)
}, { interactiveLogin: true })

console.log('\n=== RESULT ===')
console.log(JSON.stringify({
  name: result.session.name,
  subject: result.session.subject,
  expiresAt: result.session.sessionExpiresAt,
  discoveredPath: result.discoveredPath,
  examCount: result.exams.length,
  warnings: result.warnings,
  sampleExams: result.exams.slice(0, 3),
}, null, 2))

await pool.end()
