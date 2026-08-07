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
const link = (await pool.query(
  `SELECT encrypted_session_token FROM integration_links WHERE patient_id='30f2df7c-f043-44e8-a183-e6f6b49d2d71' AND portal_type='mater_dei'`,
)).rows[0]
const session = JSON.parse(decrypt(link.encrypted_session_token))

const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
  viewport: { width: 1400, height: 900 },
})
const page = await context.newPage()
const getImageUrls = []

page.on('response', (res) => {
  const u = res.url()
  if (u.includes('GetImage') && res.status() === 200) getImageUrls.push(u)
})

const domainRes = await context.request.get('https://meu.materdei.com.br/proxy/surgical/surgical/domain', {
  headers: { Authorization: `Bearer ${session.accessToken}`, Accept: 'application/json' },
  params: { accession_number: '13669361' },
})
const { url: viewerUrl } = await domainRes.json()
await page.goto(viewerUrl, { waitUntil: 'domcontentloaded', timeout: 90_000 })
await page.waitForTimeout(12_000)

console.log('captured GetImage urls:', getImageUrls.length)
for (const u of getImageUrls.slice(0, 5)) {
  console.log(u)
  const q = new URL(u).searchParams.get('ImageIdentifier')
  console.log('  decoded:', q)
}

// Try manual fetch with first identifier from Headers if we have captured url
if (getImageUrls[0]) {
  const sample = getImageUrls[0]
  const id = new URL(sample).searchParams.get('ImageIdentifier')
  const base = sample.split('/JsonEndpoint/')[0]
  const testUrl = `${base}/JsonEndpoint/GetImage/?ImageIdentifier=${encodeURIComponent(id)}`
  const viaPage = await page.evaluate(async (u) => {
    const r = await fetch(u)
    const buf = await r.arrayBuffer()
    return { ok: r.ok, status: r.status, ct: r.headers.get('content-type'), len: buf.byteLength }
  }, testUrl)
  console.log('page fetch same id:', viaPage)

  const viaCtx = await context.request.get(testUrl)
  const body = await viaCtx.body()
  console.log('context fetch:', viaCtx.status(), viaCtx.headers()['content-type'], body.length)
}

await browser.close()
await pool.end()
