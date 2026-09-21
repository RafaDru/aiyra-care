import { useEffect } from 'react'

/**
 * Landing page for Supabase OAuth on physical devices (Expo Go).
 * Supabase redirects here with tokens in the hash/query; WebBrowser returns this URL to the app.
 */
export function MobileOAuthReturnPage() {
  useEffect(() => {
    const exp =
      import.meta.env.VITE_MOBILE_OAUTH_DEEP_LINK?.trim() ||
      'exp://192.168.18.77:8081/--/auth/callback'
    const suffix = window.location.hash || window.location.search
    if (suffix && exp) {
      window.location.replace(`${exp}${suffix}`)
    }
  }, [])

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <p>Concluindo login no app…</p>
      <p style={{ color: '#666', fontSize: 14 }}>Você pode fechar esta aba se o AiyraCare já abriu.</p>
    </main>
  )
}
