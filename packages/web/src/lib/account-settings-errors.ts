import { reportApiClientError, reportClientError } from './client-errors.js'

export const ACCOUNT_SETTINGS_ROUTE = '/settings/account'
export const ACCOUNT_SETTINGS_FEATURE = 'account_settings'

export type AccountSettingsAction = 'profile_load' | 'profile_save' | 'account_delete'

/**
 * Erros em Configurações → Conta (perfil + exclusão LGPD).
 * Complementa o report automático em `api.request` com feature/código estáveis para ops.
 */
export function reportAccountSettingsFailure(
  action: AccountSettingsAction,
  options: {
    apiPath: string
    status?: number
    message?: string
  },
): void {
  const message = options.message?.slice(0, 120)
  if (options.status && options.status > 0) {
    reportApiClientError(options.apiPath, options.status, {
      route: ACCOUNT_SETTINGS_ROUTE,
      message: `${action}${message ? `:${message}` : ''}`,
    })
    return
  }
  void reportClientError({
    feature: ACCOUNT_SETTINGS_FEATURE,
    errorKind: 'api',
    errorCode: `${action}_failed`,
    route: ACCOUNT_SETTINGS_ROUTE,
    apiPath: options.apiPath,
    properties: message ? { action, message } : { action },
  }).catch(() => undefined)
}

/** Extrai status HTTP de mensagens geradas por `api.request` (ex.: "HTTP 404"). */
export function httpStatusFromError(err: unknown): number | undefined {
  if (!(err instanceof Error)) return undefined
  const m = err.message.match(/\bHTTP\s+(\d{3})\b/i)
  if (!m) return undefined
  const n = Number(m[1])
  return Number.isFinite(n) ? n : undefined
}
