import pg from 'pg'
import { readFileSync, writeFileSync } from 'fs'
import { createDecipheriv } from 'crypto'
import { request as playwrightRequest } from 'playwright'

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
const link = (await pool.query(`SELECT encrypted_session_token FROM integration_links WHERE patient_id='30f2df7c-f043-44e8-a183-e6f6b49d2d71' AND portal_type='mater_dei'`)).rows[0]
const session = JSON.parse(decrypt(link.encrypted_session_token))
const req = await playwrightRequest.newContext({ baseURL: 'https://meu.materdei.com.br' })
const auth = { Authorization: `Bearer ${session.accessToken}`, Accept: 'application/json' }
const gateway = session.gatewayPatientId ?? 1539788

const res = await req.get('/proxy/exam-results/result-exam/api/v1/patients/exams/search', {
  headers: auth,
  params: { patientId: String(gateway), startDate: '2026-01-01', endDate: '2026-12-31', pageNumber: '1', pageSize: '20' },
})
const list = (await res.json()).data ?? []
for (const row of list) {
  for (const it of row.order?.items ?? []) {
    if (!/TC/i.test(it.description ?? '')) continue
    console.log('\nITEM KEYS:', Object.keys(it))
    console.log('ITEM:', JSON.stringify(it).slice(0, 800))
    console.log('ROW keys:', Object.keys(row))
    console.log('ROW extra:', JSON.stringify(row).slice(0, 1200))
  }
}

// Try item detail endpoints from older probe
for (const itemId of [13669360, 13669361]) {
  for (const path of [
    `/proxy/exam-results/result-exam/api/v1/patients/exams/items/${itemId}`,
    `/proxy/exam-results/result-exam/api/v1/patients/exams/order/10687340`,
    `/proxy/exam-results/result-exam/api/v1/patients/exams/10687340`,
  ]) {
    const r = await req.get(path, { headers: auth })
    const t = await r.text()
    console.log('\n', path, r.status(), t.slice(0, 500))
  }
}

await req.dispose()
await pool.end()
