/**
 * Smoke test billing: Supabase user → checkout session → optional webhook verify.
 * Usage: node packages/api/scripts/billing-smoke-test.mjs [pack_10|pack_30|subscription]
 */
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const API = process.env.API_PUBLIC_URL?.trim() || 'http://127.0.0.1:3010'
const SUPABASE_URL = process.env.SUPABASE_URL?.trim()
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE?.trim()
const ANON_KEY = process.env.SUPABASE_ANON_KEY?.trim() || process.env.VITE_SUPABASE_ANON_KEY?.trim()

const mode = process.argv[2] || 'pack_10'

function fail(msg, detail) {
  console.error('FAIL:', msg, detail ?? '')
  process.exit(1)
}

if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
  fail('SUPABASE_URL / SERVICE_ROLE / ANON_KEY missing in .env')
}

const email = `billing-smoke+${Date.now()}@aiyracare.test`
const password = 'BillingSmokeTest!2026'

async function supabaseAdmin(path, body) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) fail(`Supabase admin ${path}`, json)
  return json
}

async function signIn() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const json = await res.json()
  if (!res.ok) fail('sign in', json)
  return json.access_token
}

async function api(path, token, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  const text = await res.text()
  const json = text ? JSON.parse(text) : {}
  if (!res.ok) fail(`API ${path} ${res.status}`, json)
  return json
}

console.log('1. Create Supabase user', email)
await supabaseAdmin('/auth/v1/admin/users', {
  email,
  password,
  email_confirm: true,
})

console.log('2. Sign in + sync account')
const token = await signIn()
await api('/auth/sync', token, { method: 'POST', body: '{}' })

console.log('3. GET /billing/offers')
const offers = await api('/billing/offers', token)
console.log('   stripeEnabled:', offers.stripeEnabled)
if (!offers.stripeEnabled) fail('stripe not enabled in offers')

console.log('4. GET /billing/me (before)')
const meBefore = await api('/billing/me', token)
console.log('   plan:', meBefore.entitlement?.planTier, 'credits:', meBefore.quota?.totalAvailable)

let checkoutUrl
let checkoutSessionId
if (mode === 'subscription') {
  console.log('5. POST /billing/checkout-subscription')
  const sub = await api('/billing/checkout-subscription', token, { method: 'POST', body: '{}' })
  checkoutUrl = sub.url
  checkoutSessionId = sub.sessionId
} else {
  console.log(`5. POST /billing/checkout (${mode})`)
  const checkout = await api('/billing/checkout', token, {
    method: 'POST',
    body: JSON.stringify({ packageId: mode }),
  })
  checkoutUrl = checkout.url
  checkoutSessionId = checkout.sessionId
}

if (!checkoutUrl) fail('no checkout url returned')
const cacheDir = resolve(root, '.cache')
const { mkdirSync, writeFileSync } = await import('fs')
mkdirSync(cacheDir, { recursive: true })
writeFileSync(resolve(cacheDir, 'billing-checkout-url.txt'), `${checkoutUrl}\n${token}\n${email}\n${checkoutSessionId ?? ''}\n`)
console.log('OK checkout URL saved to .cache/billing-checkout-url.txt')
console.log('sessionId:', checkoutSessionId)

if (process.argv[2] === 'verify' && process.argv[3]) {
  const sessionId = process.argv[3]
  console.log('Verifying session', sessionId)
  const meAfter = await api('/billing/me', token)
  console.log('plan:', meAfter.entitlement?.planTier, 'credits:', meAfter.quota?.totalAvailable)
}
