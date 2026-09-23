import { Platform } from 'react-native'
import { makeRedirectUri } from 'expo-auth-session'

const LOOPBACK = new Set(['localhost', '127.0.0.1', '::1'])

export function isLoopbackHostname(hostname: string): boolean {
  return LOOPBACK.has(hostname.toLowerCase())
}

export function isLoopbackWebUrl(url: string): boolean {
  try {
    return isLoopbackHostname(new URL(url).hostname)
  } catch {
    return false
  }
}

/** Host LAN inferido de `EXPO_PUBLIC_API_URL` (ex. http://192.168.x.x:3010). */
export function lanHostFromApiUrl(): string | null {
  const api = process.env.EXPO_PUBLIC_API_URL?.trim()
  if (!api) return null
  try {
    const host = new URL(api).hostname
    if (isLoopbackHostname(host)) return null
    return host
  } catch {
    return null
  }
}

function rewriteLoopbackWebUrl(url: string, lanHost: string): string {
  const u = new URL(url)
  u.hostname = lanHost
  return u.toString().replace(/\/$/, '')
}

/** Base do web dev (`:5173`) acessível no celular — nunca loopback em native. */
export function deviceWebAppBaseUrl(): string | null {
  const lanHost = lanHostFromApiUrl()
  const raw = process.env.EXPO_PUBLIC_WEB_APP_URL?.replace(/\/$/, '')
  if (raw) {
    if (Platform.OS !== 'web' && isLoopbackWebUrl(raw) && lanHost) {
      return rewriteLoopbackWebUrl(raw, lanHost)
    }
    if (Platform.OS === 'web' || !isLoopbackWebUrl(raw)) return raw
  }
  if (lanHost) return `http://${lanHost}:5173`
  return raw ?? null
}

export function getSupabaseOAuthRedirectUri(): string {
  const lanHost = lanHostFromApiUrl()
  let explicit = process.env.EXPO_PUBLIC_OAUTH_REDIRECT_URI?.trim()
  if (explicit && Platform.OS !== 'web' && isLoopbackWebUrl(explicit) && lanHost) {
    explicit = rewriteLoopbackWebUrl(explicit, lanHost)
  }
  if (explicit && (Platform.OS === 'web' || !isLoopbackWebUrl(explicit))) {
    return explicit
  }

  const webBase = deviceWebAppBaseUrl()
  if (webBase && (Platform.OS === 'web' || !isLoopbackWebUrl(webBase))) {
    return `${webBase.replace(/\/$/, '')}/mobile-oauth-return`
  }

  return makeRedirectUri({
    scheme: 'aiyracare',
    path: 'auth/callback',
    preferLocalhost: false,
  })
}
