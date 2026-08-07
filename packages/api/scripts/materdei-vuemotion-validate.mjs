import pg from 'pg'
import { readFileSync } from 'fs'
import { createDecipheriv } from 'crypto'
import { request as playwrightRequest } from 'playwright'
import { scrapeMaterDeiVueMotionForExam } from '../src/infrastructure/scraper/materdei-vuemotion.scraper.ts'

const env = Object.fromEntries(
  readFileSync(new URL('../../../.env', import.meta.url), 'utf8').split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] }),
)

function decrypt(payload) {
  const key = Buffer.from(env.CRYPTO_KEY, 'hex')
  const [ivHex, tagHex, dataHex] = payload.split(':')
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8')
}

const examId = process.argv[2] ?? '13669361'
const pool = new pg.Pool({ connectionString: env.DATABASE_URL })
const link = (await pool.query(
  `SELECT encrypted_session_token FROM integration_links WHERE patient_id='30f2df7c-f043-44e8-a183-e6f6b49d2d71' AND portal_type='mater_dei'`,
)).rows[0]
const session = JSON.parse(decrypt(link.encrypted_session_token))
const req = await playwrightRequest.newContext({ baseURL: 'https://meu.materdei.com.br' })

console.log('Testing VueMotion scrape for examOrderItemId', examId)
const result = await scrapeMaterDeiVueMotionForExam(req, session.accessToken, examId, { maxScrollSteps: 30 })

console.log('viewerUrl:', result.viewerUrl.slice(0, 80))
console.log('groups:', result.groups.map((g) => `${g.groupId}:${g.name}`).join(' | '))
console.log('images:', result.images.length)
console.log('warnings:', result.warnings)
if (result.images.length > 0) {
  const sizes = result.images.map((i) => i.byteLength)
  console.log('byte range:', Math.min(...sizes), '-', Math.max(...sizes))
}

await req.dispose()
await pool.end()
