#!/usr/bin/env node
/**
 * Merge mobile OAuth redirect patterns into Supabase Auth uri_allow_list.
 * Requires personal access token: https://supabase.com/dashboard/account/tokens
 *
 *   set SUPABASE_ACCESS_TOKEN=sbp_...
 *   node scripts/patch-supabase-auth-redirect-urls.mjs
 */
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? 'lyljosprzmtapkocmxxa'
const token = process.env.SUPABASE_ACCESS_TOKEN?.trim()
if (!token) {
  console.error('Missing SUPABASE_ACCESS_TOKEN (Supabase dashboard → Account → Access Tokens)')
  process.exit(1)
}

const LAN_IP = process.env.AIYRA_LAN_IP ?? '192.168.18.77'

const ADD = [
  'exp://**',
  `exp://${LAN_IP}:8081/--/auth/callback`,
  `exp://${LAN_IP}:8081/**`,
  'aiyracare://**',
  'aiyracare://auth/callback',
  `http://${LAN_IP}:5173/**`,
  `http://${LAN_IP}:5173/mobile-oauth-return`,
]

const base = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`
const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
}

const getRes = await fetch(base, { headers })
if (!getRes.ok) {
  console.error('GET auth config failed', getRes.status, await getRes.text())
  process.exit(1)
}
const cfg = await getRes.json()
const current = (cfg.uri_allow_list ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const merged = [...current]
for (const entry of ADD) {
  if (!merged.includes(entry)) merged.push(entry)
}

const patchRes = await fetch(base, {
  method: 'PATCH',
  headers,
  body: JSON.stringify({ uri_allow_list: merged.join(',') }),
})
if (!patchRes.ok) {
  console.error('PATCH auth config failed', patchRes.status, await patchRes.text())
  process.exit(1)
}
const out = await patchRes.json()
console.log('uri_allow_list updated:')
console.log(out.uri_allow_list ?? merged.join(','))
