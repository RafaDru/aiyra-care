/**
 * Landing page for Supabase OAuth on physical devices (Expo Go).
 * Supabase redirects here with tokens in the hash/query.
 * Expo `WebBrowser.openAuthSessionAsync` must receive this **http** URL — não redirecionar para exp:// aqui.
 */
export function MobileOAuthReturnPage() {
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <p>Concluindo login no app…</p>
      <p style={{ color: '#666', fontSize: 14 }}>Você pode fechar esta aba se o AiyraCare já abriu.</p>
    </main>
  )
}
