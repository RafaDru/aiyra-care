import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { makeRedirectUri } from 'expo-auth-session'

const LOOPBACK = new Set(['localhost', '127.0.0.1', '::1'])

export function isLoopbackHostname(hostname: string): boolean {
  return LOOPBACK.has(hostname.toLowerCase())
}

export function isLoopbackWebUrl(url: string): boolean {
  try {
    const h = new URL(url).hostname
    return isLoopbackHostname(h)
  } catch {
    return url.includes('localhost') || url.includes('127.0.0.1')
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

function metroLanHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri?.trim()
  if (hostUri) {
    const host = hostUri.split(':')[0]
    if (host && !isLoopbackHostname(host)) return host
  }
  return lanHostFromApiUrl()
}

function rewriteLoopbackWebUrl(url: string, lanHost: string): string {
  const u = new URL(url)
  u.hostname = lanHost
  return u.toString().replace(/\/$/, '')
}

/** Base do web dev (`:5173`) — só para CTAs «abrir no navegador», não OAuth nativo por padrão. */
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

/** Expo Go / dev build: `exp://<LAN>:8081/--/auth/callback` (nunca localhost). */
export function resolveNativeExpoOAuthRedirectUri(): string {
  const lanHost = metroLanHost()
  const fromMake = makeRedirectUri({
    scheme: 'aiyracare',
    path: 'auth/callback',
    preferLocalhost: false,
  })
  if (!isLoopbackWebUrl(fromMake)) return fromMake
  if (lanHost) return `exp://${lanHost}:8081/--/auth/callback`
  return fromMake
}

function resolveWebBridgeOAuthRedirectUri(): string | null {
  const lanHost = lanHostFromApiUrl()
  let explicit = process.env.EXPO_PUBLIC_OAUTH_REDIRECT_URI?.trim()
  if (explicit && isLoopbackWebUrl(explicit) && lanHost) {
    explicit = rewriteLoopbackWebUrl(explicit, lanHost)
  }
  if (explicit && !isLoopbackWebUrl(explicit)) return explicit
  const webBase = deviceWebAppBaseUrl()
  if (webBase && !isLoopbackWebUrl(webBase)) {
    return `${webBase.replace(/\/$/, '')}/mobile-oauth-return`
  }
  return null
}

/**
 * Native (Expo Go): **exp://** direto — evita bridge web e Site URL localhost do Supabase.
 * Web: bridge `/mobile-oauth-return`. Bridge nativo só com `EXPO_PUBLIC_OAUTH_USE_WEB_BRIDGE=1`.
 */
export function getSupabaseOAuthRedirectUri(): string {
  if (Platform.OS === 'web') {
    const bridge = resolveWebBridgeOAuthRedirectUri()
    if (bridge) return bridge
    return makeRedirectUri({ path: 'auth/callback', preferLocalhost: true })
  }

  const useWebBridge = process.env.EXPO_PUBLIC_OAUTH_USE_WEB_BRIDGE === '1'
  if (useWebBridge) {
    const bridge = resolveWebBridgeOAuthRedirectUri()
    if (bridge && !isLoopbackWebUrl(bridge)) return bridge
  }

  return resolveNativeExpoOAuthRedirectUri()
}
