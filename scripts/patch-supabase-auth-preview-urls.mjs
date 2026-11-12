#!/usr/bin/env node
/**
 * Merge GCP preview Cloud Run web URLs into Supabase Auth uri_allow_list
 * and set site_url to the preview web origin (does not force LAN dev site_url).
 *
 *   set SUPABASE_ACCESS_TOKEN=sbp_...
 *   node scripts/patch-supabase-auth-preview-urls.mjs
 */
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? 'lyljosprzmtapkocmxxa'
const PREVIEW_WEB =
  process.env.ANANERI_PREVIEW_WEB_URL?.trim() ??
  'https://ananeri-preview-web-kzp5ynymva-uc.a.run.app'

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim()
if (!token) {
  console.error('Missing SUPABASE_ACCESS_TOKEN (Supabase dashboard → Account → Access Tokens)')
  process.exit(1)
}

const ADD = [
  PREVIEW_WEB,
  `${PREVIEW_WEB}/**`,
  `${PREVIEW_WEB}/mobile-oauth-return`,
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
  body: JSON.stringify({
    uri_allow_list: merged.join(','),
    site_url: PREVIEW_WEB,
  }),
})
if (!patchRes.ok) {
  console.error('PATCH auth config failed', patchRes.status, await patchRes.text())
  process.exit(1)
}
const out = await patchRes.json()
console.log('site_url:', out.site_url ?? PREVIEW_WEB)
console.log('preview entries present:', ADD.every((e) => (out.uri_allow_list ?? merged.join(',')).includes(e)))
