import pg from 'pg'
import { readFileSync } from 'fs'
import { createDecipheriv } from 'crypto'
import { request as playwrightRequest } from 'playwright'
import { mapMaterDeiExamSearchResponse } from '../src/infrastructure/scraper/materdei-exam.mapper.js'

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

const pool = new pg.Pool({ connectionString: env.DATABASE_URL })
const links = (await pool.query(`SELECT il.*, p.name FROM integration_links il JOIN patients p ON p.id=il.patient_id WHERE portal_type='mater_dei' AND encrypted_session_token IS NOT NULL`)).rows
const req = await playwrightRequest.newContext({ baseURL: 'https://meu.materdei.com.br' })

for (const link of links) {
  const token = JSON.parse(decrypt(link.encrypted_session_token)).accessToken
  const auth = { Authorization: `Bearer ${token}`, Accept: 'application/json' }
  let all = []
  for (let page = 1; page <= 20; page++) {
    const res = await req.get('/proxy/exam-results/result-exam/api/v1/patients/exams/search', {
      headers: auth,
      params: { patientId: '0', startDate: '2015-01-01', endDate: '2026-12-31', pageNumber: String(page), pageSize: '50' },
    })
    const json = await res.json()
    const items = mapMaterDeiExamSearchResponse(json.data)
    if (!items.length) break
    all.push(...items)
  }
  const downloadable = all.filter((e) => {
    const it = e.raw._item ?? {}
    return it.imageAvailable || it.reportAvailable
  })
  console.log('\n', link.name, 'exams mapped:', all.length, 'downloadable flags:', downloadable.length)
  for (const e of all.slice(0, 15)) {
    const it = e.raw._item ?? {}
    console.log(' ', e.examDate.slice(0, 10), e.examType.slice(0, 40), 'rep', it.reportAvailable, 'img', it.imageAvailable, 'patient', e.patientName)
  }
}

await req.dispose()
await pool.end()
