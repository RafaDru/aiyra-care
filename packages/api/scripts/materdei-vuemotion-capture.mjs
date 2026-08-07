import pg from 'pg'
import { readFileSync } from 'fs'
import { createDecipheriv } from 'crypto'
import { chromium } from 'playwright'

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

const browser = await chromium.launch({
  headless: false,
  channel: 'chrome',
  args: ['--disable-blink-features=AutomationControlled'],
})
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  viewport: { width: 1400, height: 900 },
})
const page = await context.newPage()

const allUrls = new Set()
page.on('request', (req) => allUrls.add(req.url()))
page.on('response', async (res) => {
  const u = res.url()
  const ct = res.headers()['content-type'] ?? ''
  if (/image|octet|dicom|jpeg|png/i.test(ct) && res.status() === 200) {
    const len = (await res.body()).length
    if (len > 5000) console.log('IMG', len, ct, u.slice(0, 120))
  }
})

const domainRes = await context.request.get('https://meu.materdei.com.br/proxy/surgical/surgical/domain', {
  headers: { Authorization: `Bearer ${session.accessToken}`, Accept: 'application/json' },
  params: { accession_number: '13669361' },
})
const { url } = await domainRes.json()
console.log('opening', url?.slice(0, 100))

try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  console.log('loaded', page.url())
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(5000)
    console.log('wait', i + 1)
  }
} catch (e) {
  console.log('goto err', e.message)
}

const interesting = [...allUrls].filter((u) =>
  /wado|dicom|jpeg|jpg|png|series|instance|study|frame|thumbnail|GetImage|ImageService|vuemotion/i.test(u),
)
console.log('\ninteresting urls', interesting.length)
interesting.slice(0, 40).forEach((u) => console.log(u.slice(0, 200)))

await browser.close()
await pool.end()
