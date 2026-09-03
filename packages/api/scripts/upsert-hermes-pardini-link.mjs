import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { randomUUID } from 'crypto'
import { encrypt } from '../src/infrastructure/crypto-helper.js'
import { HermesPardiniSyncScraper } from '../src/infrastructure/scraper/hermes-pardini-sync.scraper.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
dotenv.config({ path: path.join(root, '.env') })

const patientId = 'f3cc72fd-f11c-419e-ac82-3ae45bd313ce'
const login = process.env.HERMES_PARDINI_LOGIN ?? '06376236650'
const password = process.env.HERMES_PARDINI_PASSWORD
if (!password) {
  console.error('HERMES_PARDINI_PASSWORD required')
  process.exit(1)
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

const existing = await pool.query(
  `SELECT id FROM integration_links WHERE patient_id = $1 AND portal_type = 'hermes_pardini'`,
  [patientId],
)

const scraper = new HermesPardiniSyncScraper()
const result = await scraper.scrape(login, password, (p) => console.log(`[${p.status}] ${p.step}: ${p.message}`))

const sessionEnc = encrypt(JSON.stringify(result.session))
const linkId = existing.rows[0]?.id ?? randomUUID()

if (existing.rows.length > 0) {
  await pool.query(
    `UPDATE integration_links SET email=$1, encrypted_password=$2, encrypted_session_token=$3,
     session_expires_at=$4, active=true, last_sync_at=NOW(), updated_at=NOW() WHERE id=$5`,
    [login, encrypt(password), sessionEnc, result.session.sessionExpiresAt, linkId],
  )
} else {
  await pool.query(
    `INSERT INTO integration_links (id, patient_id, portal_type, email, encrypted_password,
     encrypted_session_token, session_expires_at, active, last_sync_at)
     VALUES ($1,$2,'hermes_pardini',$3,$4,$5,$6,true,NOW())`,
    [linkId, patientId, login, encrypt(password), sessionEnc, result.session.sessionExpiresAt],
  )
}

console.log('\nLink id:', linkId)
console.log('Session expires:', result.session.sessionExpiresAt)
console.log('Exams found:', result.exams.length)
console.log('Warnings:', result.warnings)

await pool.end()
