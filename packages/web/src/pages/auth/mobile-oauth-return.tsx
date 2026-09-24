import { useEffect, useState } from 'react'
import { resolveMobileOAuthExpoDeepLink } from '../../lib/mobile-oauth-deep-link.js'

function oauthPayloadInLocation(): boolean {
  const hash = window.location.hash
  const search = window.location.search
  return (
    hash.includes('access_token') ||
    hash.includes('code=') ||
    search.includes('code=') ||
    search.includes('error=') ||
    search.includes('error_description=')
  )
}

/** Repassa hash/query do Supabase para `exp://…/auth/callback` (Expo Go ingest via Linking). */
function buildExpoCallbackUrl(): string | null {
  if (!oauthPayloadInLocation()) return null
  const base = resolveMobileOAuthExpoDeepLink(window.location.hostname)
  const hash = window.location.hash
  const search = window.location.search
  if (hash.length > 1) return `${base}${hash}`
  if (search) return `${base}${search}`
  return null
}

/**
 * Landing Supabase OAuth no dispositivo (Custom Tabs).
 * `openAuthSessionAsync` costuma retornar `dismiss` após abrir o app — tokens vão no deep link.
 */
export function MobileOAuthReturnPage() {
  const [phase, setPhase] = useState<'opening' | 'fallback'>('opening')

  useEffect(() => {
    const expoUrl = buildExpoCallbackUrl()
    if (!expoUrl) {
      setPhase('fallback')
      return
    }
    window.location.replace(expoUrl)
    const timer = window.setTimeout(() => setPhase('fallback'), 3000)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      {phase === 'opening' ? (
        <>
          <p style={{ fontSize: 18, fontWeight: 600 }}>Abrindo o AiyraCare…</p>
          <p style={{ color: '#666', fontSize: 14 }}>Aguarde — você deve voltar ao app automaticamente.</p>
        </>
      ) : (
        <>
          <p>Concluindo login no app…</p>
          <p style={{ color: '#666', fontSize: 14 }}>
            Se o app não abriu, volte ao Expo Go. O login pode já estar concluído.
          </p>
        </>
      )}
    </main>
  )
}
