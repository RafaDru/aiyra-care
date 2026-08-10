import type { IntegrationLink } from '../../domain/integration-link/integration-link.entity.js'
import { isUnimedSessionUsable } from '../../infrastructure/scraper/unimedbh-login.helper.js'

const SESSION_SKEW_MS = 60_000

/** Sessão persistida ainda válida para sync sem abrir browser de login. */
export function isIntegrationLinkSessionReady(
  link: IntegrationLink,
  expiresAt?: Date | null,
): boolean {
  const exp = expiresAt ?? link.sessionExpiresAt
  if (!link.encryptedSessionToken || !exp) return false

  if (link.portalType === 'unimed') {
    return isUnimedSessionUsable(exp, SESSION_SKEW_MS)
  }

  return exp.getTime() > Date.now() + SESSION_SKEW_MS
}
