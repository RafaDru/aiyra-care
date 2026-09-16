/**
 * PoC — autenticação Precision Care (Grupo Fleury).
 *
 * Modos:
 *   --otp (default)  Login interativo OTP (SMS/e-mail/WhatsApp) — usuário completa no browser.
 *   --password       Preenche senha do protocolo (vínculo hermes_pardini no DB).
 *
 * Entrada:
 *   --unified (default) https://resultados.grupofleury.com.br
 *   --pardini           ?origin=pardini
 *
 * Uso:
 *   cd packages/api && npm run probe:fleury-auth
 *   cd packages/api && npm run probe:fleury-auth -- --password --pardini
 *
 * Artefato: packages/api/scripts/output/fleury-precision-probe.json
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { chromium, request as playwrightRequest } from 'playwright'
import { decrypt } from '../src/infrastructure/crypto-helper.js'
import {
  hermesPardiniPortalEntryUrl,
  fleuryPrecisionUnifiedEntryUrl,
  HERMES_PARDINI_PRECISION_CARE,
} from '../src/infrastructure/scraper/hermes-pardini.portal.js'
import {
  attachHermesPardiniTokenCapture,
  dismissHermesPardiniSecurityModal,
  fillHermesPardiniPasswordForm,
  navigateHermesPardiniResultadosExame,
  openFleuryPrecisionUnifiedPortal,
  openHermesPardiniPortalLogin,
  submitHermesPardiniPasswordForm,
} from '../src/infrastructure/scraper/hermes-pardini-login.helper.js'
import { loginHermesPardiniApi, sessionExpiresAtFromToken } from '../src/infrastructure/scraper/hermes-pardini-auth.js'
import { probeHermesPardiniPacienteAccess } from '../src/infrastructure/scraper/hermes-pardini-bff.service.js'
import { writeFleuryProbeArtifact } from './lib/fleury-precision-probe-output.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
dotenv.config({ path: path.join(root, '.env') })

const args = new Set(process.argv.slice(2))
const usePassword = args.has('--password')
const usePardiniEntry = args.has('--pardini')
const entryUrl = usePardiniEntry ? hermesPardiniPortalEntryUrl() : fleuryPrecisionUnifiedEntryUrl()
const mode = usePassword ? 'password' : 'otp'

const networkLog = []

async function loadLinkCredentials() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
  })
  try {
    const res = await pool.query(
      `SELECT email, encrypted_password FROM integration_links
       WHERE portal_type = 'hermes_pardini' AND active = true LIMIT 1`,
    )
    if (!res.rows.length) return null
    return {
      login: res.rows[0].email,
      password: decrypt(res.rows[0].encrypted_password),
    }
  } finally {
    await pool.end()
  }
}

function maskLogin(login) {
  const digits = login.replace(/\D/g, '')
  if (digits.length === 11) return digits.replace(/(\d{3})\d{5}(\d{2})/, '$1*****$2')
  return `${login.slice(0, 3)}…`
}

function decodeJwtPayload(token) {
  try {
    return JSON.parse(
      Buffer.from(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
    )
  } catch {
    return {}
  }
}

console.log('=== Fleury Precision Care — PoC auth ===')
console.log('Modo:', mode)
console.log('Entrada:', entryUrl)

const http = await playwrightRequest.newContext()
let ropcResult = null

if (usePassword) {
  const creds = await loadLinkCredentials()
  if (!creds) {
    console.error('Nenhum vínculo hermes_pardini ativo — use --otp ou crie vínculo')
    process.exit(1)
  }
  console.log('Login (mascarado):', maskLogin(creds.login))
  try {
    const tokens = await loginHermesPardiniApi(http, creds.login, creds.password)
    const probe = await probeHermesPardiniPacienteAccess(http, tokens.accessToken)
    ropcResult = {
      ok: true,
      pedidosProbe: probe,
      tokenPreview: tokens.accessToken.slice(0, 24) + '…',
      jwt: decodeJwtPayload(tokens.accessToken),
    }
    console.log('ROPC: token OK, GET /pedidos:', probe ? 'OK' : '401/403')
  } catch (e) {
    ropcResult = { ok: false, error: e instanceof Error ? e.message : String(e) }
    console.log('ROPC error:', ropcResult.error)
  }
}

const browser = await chromium.launch({ headless: false, slowMo: 80 })
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
    url.includes('/openid-connect/auth') ||
    url.includes('/paciente/api/v1/pedidos')
  ) {
    let snippet = ''
    try {
      if (url.includes('/openid-connect/auth')) {
        const u = new URL(url)
        snippet = JSON.stringify({
          client_id: u.searchParams.get('client_id'),
          response_type: u.searchParams.get('response_type'),
          scope: u.searchParams.get('scope'),
          code_challenge_method: u.searchParams.get('code_challenge_method'),
        })
      } else if (url.includes('/token')) {
        const j = await response.json()
        snippet = JSON.stringify({
          grant: response.request().postData()?.match(/grant_type=\w+/)?.[0],
          access_token: j.access_token ? `${j.access_token.slice(0, 20)}…` : null,
          refresh_token: j.refresh_token ? 'yes' : 'no',
          error: j.error,
        })
      } else {
        snippet = (await response.text()).slice(0, 160)
      }
    } catch {
      snippet = '(body unreadable)'
    }
    const entry = { status: response.status(), url: url.replace(/\?.*$/, ''), snippet }
    networkLog.push(entry)
    console.log(`[NET ${entry.status}] ${entry.url}`, entry.snippet)
  }
})

const creds = usePassword ? await loadLinkCredentials() : null
const capture = attachHermesPardiniTokenCapture(
  page,
  creds ? { login: creds.login, password: creds.password } : undefined,
)

if (usePardiniEntry) {
  await openHermesPardiniPortalLogin(page)
} else {
  await openFleuryPrecisionUnifiedPortal(page)
}

console.log('URL após abertura:', page.url())
await dismissHermesPardiniSecurityModal(page)

if (mode === 'otp') {
  console.log('\n>>> Complete o login no browser (SMS, e-mail ou WhatsApp).')
  console.log('>>> Aguardando token + GET /pedidos (até 3 min)…\n')
} else if (creds) {
  await fillHermesPardiniPasswordForm(page, creds.login, creds.password)
  await submitHermesPardiniPasswordForm(page)
}

let browserLogin
try {
  browserLogin = await capture.waitForTokens(mode === 'otp' ? 180_000 : 120_000)
} catch (e) {
  console.error('Browser login falhou:', e instanceof Error ? e.message : e)
  await browser.close()
  await http.dispose()
  process.exit(1)
}

await navigateHermesPardiniResultadosExame(page).catch(() => {})
await page.waitForTimeout(2000)

const { accessToken, refreshToken } = browserLogin.tokens
const jwt = decodeJwtPayload(accessToken)
const pedidosProbeDefault = await probeHermesPardiniPacienteAccess(
  http,
  accessToken,
  browserLogin.pedidosRequestHeaders,
)

const artifactPath = await writeFleuryProbeArtifact({
  mode,
  entryUrl,
  finalUrl: page.url(),
  ropc: ropcResult,
  networkLog,
  token: {
    accessTokenPreview: accessToken.slice(0, 32) + '…',
    ...(process.env.FLEURY_PROBE_SAVE_FULL_TOKEN === '1' ? { accessTokenFull: accessToken } : {}),
    refreshTokenPresent: Boolean(refreshToken),
    ...(process.env.FLEURY_PROBE_SAVE_FULL_TOKEN === '1' && refreshToken ? { refreshTokenFull: refreshToken } : {}),
    expiresAt: sessionExpiresAtFromToken(accessToken).toISOString(),
    jwt: {
      iss: jwt.iss,
      aud: jwt.aud,
      azp: jwt.azp,
      sub: jwt.sub,
      exp: jwt.exp,
    },
  },
  pedidosRequestHeaders: browserLogin.pedidosRequestHeaders ?? null,
  pedidosProbeDefault,
  apiBases: {
    pacienteApiBase: HERMES_PARDINI_PRECISION_CARE.pacienteApiBase,
    keycloakRealm: HERMES_PARDINI_PRECISION_CARE.keycloak.realm,
    keycloakClientId: HERMES_PARDINI_PRECISION_CARE.keycloak.clientId,
  },
})

console.log('\n=== Resultado ===')
console.log('GET /pedidos (headers capturados):', pedidosProbeDefault ? 'OK' : 'falhou')
console.log('Headers capturados:', JSON.stringify(browserLogin.pedidosRequestHeaders ?? {}, null, 2))
console.log('JWT azp (client):', jwt.azp)
console.log('Artefato:', artifactPath)
console.log('\nPróximo passo: npm run probe:fleury-marca')

await page.waitForTimeout(3000)
await browser.close()
await http.dispose()
