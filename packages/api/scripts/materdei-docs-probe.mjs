import pg from 'pg'
import { readFileSync } from 'fs'
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
const link = (await pool.query(`SELECT encrypted_session_token FROM integration_links il JOIN patients p ON p.id=il.patient_id WHERE portal_type='mater_dei' AND p.name ILIKE '%bruno%' LIMIT 1`)).rows[0]
const token = JSON.parse(decrypt(link.encrypted_session_token)).accessToken
const req = await playwrightRequest.newContext({ baseURL: 'https://meu.materdei.com.br' })
const auth = { Authorization: `Bearer ${token}`, Accept: 'application/json' }

for (const pid of [0, 1, 609856]) {
  for (const docType of ['Laudo dos exames', 'Pedido médico', 'Exames laboratoriais']) {
    const url = `/proxy/documents/documents/api/v1/document/patient/${pid}/type/${encodeURIComponent(docType)}`
    const res = await req.get(url, { headers: auth })
    const json = await res.json().catch(() => ({}))
    const list = Array.isArray(json.data) ? json.data : []
    console.log('pid', pid, docType, res.status(), list.length)
    if (list[0]) console.log(' sample', JSON.stringify(list[0]).slice(0, 300))
  }
}

await req.dispose()
await pool.end()
