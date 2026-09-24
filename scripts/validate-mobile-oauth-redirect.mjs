#!/usr/bin/env node
/**
 * Valida redirect OAuth nativo (exp://) — espelha oauth-redirect-url.ts (native, sem bridge).
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = resolve(root, 'packages/mobile/.env')
const env = {}
for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const i = t.indexOf('=')
  if (i < 1) continue
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
}

const LOOPBACK = new Set(['localhost', '127.0.0.1', '::1'])
function isLoopbackHostname(h) {
  return LOOPBACK.has(h.toLowerCase())
}
function lanHostFromApiUrl() {
  const api = env.EXPO_PUBLIC_API_URL?.trim()
  if (!api) return null
  try {
    const host = new URL(api).hostname
    if (isLoopbackHostname(host)) return null
    return host
  } catch {
    return null
  }
}

const lan = lanHostFromApiUrl()
const useBridge = env.EXPO_PUBLIC_OAUTH_USE_WEB_BRIDGE === '1'
let redirectTo
if (useBridge) {
  const explicit = env.EXPO_PUBLIC_OAUTH_REDIRECT_URI?.trim()
  redirectTo = explicit || (lan ? `http://${lan}:5173/mobile-oauth-return` : null)
} else {
  redirectTo = lan ? `exp://${lan}:8081/--/auth/callback` : null
}

if (!redirectTo) {
  console.error('Could not resolve redirectTo — set EXPO_PUBLIC_API_URL to LAN IP')
  process.exit(1)
}

console.log('[Aiyra OAuth] redirectTo (signInWithOAuth)', redirectTo)
if (redirectTo.includes('localhost') || redirectTo.includes('127.0.0.1')) {
  console.error('FAIL: redirectTo still loopback')
  process.exit(1)
}
if (!redirectTo.startsWith('exp://') && !useBridge) {
  console.error('FAIL: expected exp:// for native OAuth')
  process.exit(1)
}
process.exit(0)
