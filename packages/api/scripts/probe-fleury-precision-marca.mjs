/**
 * PoC — replay GET /pedidos com perfis de marca (Precision Care).
 *
 * Token:
 *   FLEURY_PROBE_ACCESS_TOKEN no .env, ou artefato de probe:fleury-auth
 *
 * Uso:
 *   cd packages/api && npm run probe:fleury-marca
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { request as playwrightRequest } from 'playwright'
import {
  FLEURY_PRECISION_MARCA_PROBE_ORDER,
  FLEURY_PRECISION_MARCA_PROFILES,
  HERMES_PARDINI_PRECISION_CARE,
  hermesPardiniResultadosExameUrl,
} from '../src/infrastructure/scraper/hermes-pardini.portal.js'
import {
  FLEURY_PROBE_ARTIFACT_PATH,
  readFleuryProbeArtifact,
  writeFleuryProbeArtifact,
} from './lib/fleury-precision-probe-output.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
dotenv.config({ path: path.join(root, '.env') })

const base = HERMES_PARDINI_PRECISION_CARE.pacienteApiBase
const origin = HERMES_PARDINI_PRECISION_CARE.portalOrigin
const referer = hermesPardiniResultadosExameUrl()

async function resolveAccessToken() {
  const envToken = process.env.FLEURY_PROBE_ACCESS_TOKEN?.trim()
  if (envToken) return { token: envToken, source: 'env' }

  try {
    const artifact = await readFleuryProbeArtifact()
    if (artifact.token?.accessTokenFull) {
      return { token: artifact.token.accessTokenFull, source: 'artifact' }
    }
    throw new Error(
      `Artefato em ${FLEURY_PROBE_ARTIFACT_PATH} sem token completo. ` +
        'Rode npm run probe:fleury-auth com FLEURY_PROBE_SAVE_FULL_TOKEN=1 no .env, ' +
        'ou defina FLEURY_PROBE_ACCESS_TOKEN.',
    )
  } catch (e) {
    if (e.code === 'ENOENT') {
      throw new Error('Rode npm run probe:fleury-auth antes ou defina FLEURY_PROBE_ACCESS_TOKEN')
    }
    throw e
  }
}

function countPedidos(body) {
  try {
    const json = JSON.parse(body)
    const dados = json.dados
    if (Array.isArray(dados)) return { count: dados.length, hasNext: Boolean(json.temPaginaSeguinte) }
    return { count: 0, hasNext: false, rawKeys: Object.keys(json) }
  } catch {
    return { count: 0, error: 'invalid json', preview: body.slice(0, 120) }
  }
}

async function probePedidos(request, accessToken, profileKey, extraHeaders = {}) {
  const profile = FLEURY_PRECISION_MARCA_PROFILES[profileKey] ?? {}
  const headers = {
    ...profile,
    ...extraHeaders,
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    Origin: origin,
    Referer: referer,
  }
  const res = await request.get(`${base}/pedidos`, {
    headers,
    params: { limit: 5, offset: 0, crescente: 'false', status: '' },
  })
  const body = await res.text()
  const parsed = countPedidos(body)
  return {
    profileKey,
    status: res.status(),
    ok: res.ok(),
    headersSent: profile,
    ...parsed,
    bodyPreview: res.ok() ? undefined : body.slice(0, 200),
  }
}

console.log('=== Fleury Precision Care — PoC marca ===')

const { token, source } = await resolveAccessToken()
console.log('Token source:', source)
console.log('API:', base)

const http = await playwrightRequest.newContext()
const results = []

let capturedHeaders = {}
try {
  const artifact = await readFleuryProbeArtifact()
  capturedHeaders = artifact.pedidosRequestHeaders ?? {}
} catch { /* optional */ }

for (const key of FLEURY_PRECISION_MARCA_PROBE_ORDER) {
  const row = await probePedidos(http, token, key)
  results.push(row)
  console.log(
    `[${key}] HTTP ${row.status} — pedidos: ${row.count ?? 0}${row.hasNext ? ' (+página)' : ''}`,
  )
}

if (Object.keys(capturedHeaders).length > 0) {
  console.log('\n--- Replay com headers capturados do browser ---')
  const captured = await probePedidos(http, token, 'none', capturedHeaders)
  results.push({ ...captured, profileKey: 'browser_captured' })
  console.log(
    `[browser_captured] HTTP ${captured.status} — pedidos: ${captured.count ?? 0}`,
  )
}

const artifactPath = await writeFleuryProbeArtifact({
  marcaProbe: {
    probedAt: new Date().toISOString(),
    results,
    capturedHeadersUsed: capturedHeaders,
  },
})

console.log('\nResumo salvo em:', artifactPath)
await http.dispose()

const anyOk = results.some((r) => r.ok && (r.count ?? 0) > 0)
if (!anyOk) {
  console.warn('Nenhum perfil retornou pedidos — verifique token ou headers.')
  process.exit(1)
}
