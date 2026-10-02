import type { TFunction } from 'i18next'

function rawMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : JSON.stringify(error)

  let msg = raw
  try {
    const parsed = JSON.parse(raw) as { msg?: string }
    if (parsed.msg) msg = parsed.msg
  } catch {
    // not JSON
  }
  return msg
}

/** Mensagens amigáveis para erros de auth (Supabase), com i18n quando há chave conhecida. */
export function formatAuthError(error: unknown, t: TFunction): string {
  const msg = rawMessage(error)
  const lower = msg.toLowerCase()

  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return t('authErrors.invalidCredentials')
  }
  if (lower.includes('email not confirmed')) {
    return t('authErrors.emailNotConfirmed')
  }
  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return t('authErrors.userAlreadyRegistered')
  }
  if (lower.includes('provider is not enabled') || lower.includes('unsupported provider')) {
    if (lower.includes('azure') || lower.includes('microsoft')) {
      return t('authErrors.microsoftDisabled')
    }
    return t('authErrors.socialDisabled')
  }

  return msg
}
