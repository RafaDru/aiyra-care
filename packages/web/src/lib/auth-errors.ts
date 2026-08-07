/** Mensagens amigáveis para erros de auth (Supabase). */
export function formatAuthError(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : JSON.stringify(error)

  let msg = raw
  try {
    const parsed = JSON.parse(raw) as { msg?: string; error_code?: string }
    if (parsed.msg) msg = parsed.msg
  } catch {
    // not JSON
  }

  const lower = msg.toLowerCase()
  if (lower.includes('provider is not enabled') || lower.includes('unsupported provider')) {
    if (lower.includes('azure') || lower.includes('microsoft')) {
      return 'Login com Microsoft não está habilitado no Supabase. Ative em Authentication → Providers → Azure (ver docs/SUPABASE.md).'
    }
    return 'Login social não está habilitado no Supabase. Verifique Authentication → Providers (ver docs/SUPABASE.md).'
  }

  return msg
}
