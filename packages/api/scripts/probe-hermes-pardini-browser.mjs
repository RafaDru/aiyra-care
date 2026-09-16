/**
 * Diagnóstico Hermes Pardini — browser visível + log de rede (token + paciente API).
 * Uso: node packages/api/scripts/probe-hermes-pardini-browser.mjs
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { chromium } from 'playwright'
import { decrypt } from '../src/infrastructure/crypto-helper.js'
import { hermesPardiniPortalEntryUrl, HERMES_PARDINI_PRECISION_CARE } from '../src/infrastructure/scraper/hermes-pardini.portal.js'
import {
  fillHermesPardiniPasswordForm,
  submitHermesPardiniPasswordForm,
  dismissHermesPardiniSecurityModal,
} from '../src/infrastructure/scraper/hermes-pardini-login.helper.js'
import { request as playwrightRequest } from 'playwright'
import { probeHermesPardiniPacienteAccess } from '../src/infrastructure/scraper/hermes-pardini-bff.service.js'
import { loginHermesPardiniApi } from '../src/infrastructure/scraper/hermes-pardini-auth.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
dotenv.config({ path: path.join(root, '.env') })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

const linkRow = await pool.query(
  `SELECT email, encrypted_password FROM integration_links
   WHERE portal_type = 'hermes_pardini' AND active = true LIMIT 1`,
)
await pool.end()

if (!linkRow.rows.length) {
  console.error('Nenhum vínculo hermes_pardini ativo')
  process.exit(1)
}

const login = linkRow.rows[0].email
const password = decrypt(linkRow.rows[0].encrypted_password)
console.log('Login (mascarado):', login.replace(/(\d{3})\d{5}(\d{2})/, '$1*****$2'))

const networkLog = []

// 1) ROPC HTTP probe (diagnóstico — sync não usa ROPC para fetch)
const http = await playwrightRequest.newContext()
try {
  console.log('\n=== HTTP ROPC (diagnóstico — token pode não autorizar /pedidos) ===')
  const tokens = await loginHermesPardiniApi(http, login, password)
  console.log('ROPC OK, access_token length:', tokens.accessToken.length)
  const probe = await probeHermesPardiniPacienteAccess(http, tokens.accessToken)
  console.log('Probe GET /pedidos:', probe ? 'OK' : '401/403')
  if (!probe) {
    const res = await http.get(`${HERMES_PARDINI_PRECISION_CARE.pacienteApiBase}/pedidos`, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        Accept: 'application/json',
        Origin: HERMES_PARDINI_PRECISION_CARE.portalOrigin,
        Referer: HERMES_PARDINI_PRECISION_CARE.portalEntryUrl,
      },
      params: { limit: 1, offset: 0, crescente: 'false', status: '' },
    })
    console.log('Pedidos status:', res.status(), await res.text().then((t) => t.slice(0, 300)))
  }
} catch (e) {
  console.log('ROPC error:', e instanceof Error ? e.message : e)
}

// 2) Browser with network capture
console.log('\n=== Browser login (headed) ===')
const browser = await chromium.launch({
  headless: false,
  slowMo: 100,
})
const context = await browser.newContext({
  locale: 'pt-BR',
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
})

const page = await context.newPage()

page.on('response', async (response) => {
  const url = response.url()
  if (
    url.includes('/openid-connect/token') ||
    url.includes('/paciente/api/v1/pedidos') ||
    url.includes('/precision-care/api')
  ) {
    let snippet = ''
    try {
      if (url.includes('/token')) {
        const j = await response.json()
        snippet = JSON.stringify({
          access_token: j.access_token ? `${j.access_token.slice(0, 20)}…` : null,
          refresh_token: j.refresh_token ? 'yes' : 'no',
          error: j.error,
        })
      } else {
        snippet = (await response.text()).slice(0, 120)
      }
    } catch {
      snippet = '(body unreadable)'
    }
    const entry = { status: response.status(), url: url.replace(/\?.*$/, ''), snippet }
    networkLog.push(entry)
    console.log(`[NET ${entry.status}] ${entry.url}`, entry.snippet)
  }
})

await page.goto(hermesPardiniPortalEntryUrl(), { waitUntil: 'domcontentloaded', timeout: 60_000 })
console.log('URL após goto:', page.url())

// OAuth params observados
const authUrl = page.url()
if (authUrl.includes('openid-connect/auth')) {
  const u = new URL(authUrl)
  console.log('OAuth client_id:', u.searchParams.get('client_id'))
  console.log('OAuth response_type:', u.searchParams.get('response_type'))
  console.log('OAuth response_mode:', u.searchParams.get('response_mode'))
  console.log('OAuth scope:', u.searchParams.get('scope'))
  console.log('OAuth PKCE:', u.searchParams.get('code_challenge_method'))
}

await dismissHermesPardiniSecurityModal(page)

// DOM ids do formulário
const domInfo = await page.evaluate(() => {
  const ids = ['_username', '_password', '_cpf', '_birthdate', '_login-type', 'kc-form-login']
  const out = {}
  for (const id of ids) {
    const el = document.getElementById(id)
    out[id] = el
      ? {
          tag: el.tagName,
          type: el.type || null,
          visible: el.offsetParent !== null,
        }
      : null
  }
  const toggles = Array.from(document.querySelectorAll('button')).map((b) => b.textContent?.trim()).filter(Boolean)
  return { fields: out, buttons: toggles.slice(0, 15) }
})
console.log('DOM login:', JSON.stringify(domInfo, null, 2))

await fillHermesPardiniPasswordForm(page, login, password)
await submitHermesPardiniPasswordForm(page)

console.log('Aguardando redirect / token (120s)...')
const deadline = Date.now() + 120_000
let landed = false
while (Date.now() < deadline) {
  const url = page.url()
  if (url.includes('resultados.grupofleury.com.br') && !url.includes('openid-connect')) {
    landed = true
    break
  }
  if (url.includes('access_token') || url.includes('code=')) {
    landed = true
    break
  }
  await page.waitForTimeout(500)
}

console.log('URL final:', page.url().slice(0, 120))
console.log('Landed app:', landed)

if (landed) {
  await page.waitForTimeout(5000)
  const title = await page.title()
  console.log('Page title:', title)
  const navLinks = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a, button'))
      .map((el) => el.textContent?.trim())
      .filter((t) => t && t.length < 40)
      .slice(0, 30),
  )
  console.log('UI labels:', navLinks.join(' | '))
}

console.log('\nNetwork summary:', networkLog.length, 'relevant responses')
await page.waitForTimeout(8000)
await browser.close()
await http.dispose()
console.log('Done.')
