/**
 * Deep link Expo após OAuth no bridge `/mobile-oauth-return`.
 * Se o redirect Supabase ainda apontar para localhost no PC, o celular abre localhost:5173 —
 * usamos `VITE_MOBILE_LAN_IP` para montar `exp://<LAN>:8081/...`.
 */
export function resolveMobileOAuthExpoDeepLink(pageHostname: string): string {
  const explicit = import.meta.env.VITE_MOBILE_OAUTH_DEEP_LINK?.trim()
  if (explicit) return explicit

  const lanIp = import.meta.env.VITE_MOBILE_LAN_IP?.trim()
  const host =
    (pageHostname === 'localhost' || pageHostname === '127.0.0.1' || pageHostname === '::1') && lanIp
      ? lanIp
      : pageHostname || '127.0.0.1'

  return `exp://${host}:8081/--/auth/callback`
}
