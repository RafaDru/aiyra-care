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
const link = (await pool.query(`SELECT * FROM integration_links WHERE portal_type='mater_dei' AND patient_id=(SELECT id FROM patients WHERE name ILIKE '%bruno%' LIMIT 1) LIMIT 1`)).rows[0]
if (!link?.encrypted_session_token) {
  console.log('No Bruno mater_dei session — run sync on Bruno link first')
  process.exit(1)
}
console.log('Link CPF:', link.email, 'patient_id:', link.patient_id)

const session = JSON.parse(decrypt(link.encrypted_session_token))
const token = session.accessToken
const req = await playwrightRequest.newContext({ baseURL: ORIGIN })
const auth = { Authorization: `Bearer ${token}`, Accept: 'application/json' }

const profileRes = await req.get('/proxy/auth/auth/patient/auth/profile', { headers: auth })
const profileJson = await profileRes.json()
const patient = profileJson.data?.patient ?? {}
console.log('Titular:', patient.name, 'dependents:', patient.dependents?.length ?? 0)
for (const d of patient.dependents ?? []) {
  console.log(' - dep', d.patientId ?? d.patient_id, d.name, d.identifier)
}

const bruno = (await pool.query(`SELECT id, name, birth_date FROM patients WHERE name ILIKE '%bruno%'`)).rows[0]
console.log('Local Bruno:', bruno)

const ids = new Set([0])
for (const d of patient.dependents ?? []) {
  const pid = d.patientId ?? d.patient_id
  if (pid != null) ids.add(Number(pid))
}

for (const pid of ids) {
  const res = await req.get('/proxy/exam-results/result-exam/api/v1/patients/exams/search', {
    headers: auth,
    params: { patientId: pid, startDate: '2015-01-01', endDate: '2026-12-31', pageNumber: 1, pageSize: 50 },
  })
  const json = await res.json()
  const list = Array.isArray(json.data) ? json.data : json.data?.content ?? json.data?.items ?? []
  console.log(`\nExams patientId=${pid}: status=${res.status()} count=${list.length}`)
  if (list[0]) {
    const sample = list[0]
    console.log('Sample keys:', Object.keys(sample))
    console.log('Sample order keys:', sample.order ? Object.keys(sample.order) : null)
    if (sample.order?.items?.[0]) console.log('Sample item keys:', Object.keys(sample.order.items[0]))
    console.log('Sample JSON snippet:', JSON.stringify(sample).slice(0, 800))
  }
}

const gatewayId = patient.gatewayPatientId ?? patient.gateway_patient_id ?? session.gatewayPatientId
for (const docType of ['Laudo dos exames', 'Pedido médico', 'Exames laboratoriais']) {
  const url = `/proxy/documents/documents/api/v1/document/patient/${gatewayId}/type/${encodeURIComponent(docType)}`
  const res = await req.get(url, { headers: auth })
  const json = await res.json().catch(() => ({}))
  const list = Array.isArray(json.data) ? json.data : json.data?.documents ?? json.data?.items ?? []
  console.log(`\nDocs ${docType}: status=${res.status()} count=${list.length}`)
  if (list[0]) {
    console.log('Doc sample keys:', Object.keys(list[0]))
    console.log('Doc sample:', JSON.stringify(list[0]).slice(0, 500))
  }
}

await req.dispose()
await pool.end()
