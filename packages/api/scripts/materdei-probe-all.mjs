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

const ORIGIN = 'https://meu.materdei.com.br'
const pool = new pg.Pool({ connectionString: env.DATABASE_URL })
const links = (await pool.query(`
  SELECT il.*, p.name AS patient_name FROM integration_links il
  JOIN patients p ON p.id = il.patient_id
  WHERE il.portal_type = 'mater_dei' AND il.encrypted_session_token IS NOT NULL
`)).rows

const req = await playwrightRequest.newContext({ baseURL: ORIGIN })

for (const link of links) {
  console.log('\n===', link.patient_name, link.email, '===')
  let session
  try { session = JSON.parse(decrypt(link.encrypted_session_token)) } catch { console.log('decrypt fail'); continue }
  const auth = { Authorization: `Bearer ${session.accessToken}`, Accept: 'application/json' }
  const profileRes = await req.get('/proxy/auth/auth/patient/auth/profile', { headers: auth })
  const profileJson = await profileRes.json()
  const patient = profileJson.data?.patient ?? {}
  console.log('Profile:', patient.name, 'deps:', (patient.dependents ?? []).length)

  const ids = new Set([0])
  for (const d of patient.dependents ?? []) {
    const pid = d.patientId ?? d.patient_id
    if (pid != null) ids.add(Number(pid))
  }

  let total = 0
  let withFiles = 0
  for (const pid of ids) {
    for (let page = 1; page <= 5; page++) {
      const res = await req.get('/proxy/exam-results/result-exam/api/v1/patients/exams/search', {
        headers: auth,
        params: { patientId: pid, startDate: '2015-01-01', endDate: '2026-12-31', pageNumber: String(page), pageSize: '50' },
      })
      const json = await res.json()
      const list = Array.isArray(json.data) ? json.data : []
      if (!list.length) break
      total += list.length
      for (const row of list) {
        for (const it of row.order?.items ?? []) {
          if (it.imageAvailable || it.reportAvailable) withFiles++
          if (it.imageAvailable || it.reportAvailable) {
            console.log(' FILE', it.description, 'img', it.imageAvailable, 'rep', it.reportAvailable, 'id', it.id)
          }
        }
      }
    }
  }
  console.log('Total exam rows:', total, 'items with files:', withFiles)
}

await req.dispose()
await pool.end()
