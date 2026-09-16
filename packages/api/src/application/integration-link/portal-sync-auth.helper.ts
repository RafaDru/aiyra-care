import type { IntegrationLink } from '../../domain/integration-link/integration-link.entity.js'
import type { IntegrationLinkRepository } from '../../domain/integration-link/integration-link.repository.js'
import {
  classifyPortalAuthFailure,
  authAttentionFromFailure,
  userMessageForAuthFailure,
  type PortalAuthFailureKind,
} from '../../domain/portal-auth/portal-auth-failure.js'
import { isHermesPardiniOAuthSessionRejected } from '../../infrastructure/scraper/hermes-pardini-auth.js'

export function classifyPortalSyncFailure(portalType: string, message: string): PortalAuthFailureKind {
  if (portalType === 'hermes_pardini' && isHermesPardiniOAuthSessionRejected(message)) {
    return 'session_expired'
  }
  return classifyPortalAuthFailure(message)
}

export async function applyPortalSyncAuthFailure(
  link: IntegrationLink,
  linkRepo: IntegrationLinkRepository,
  portalType: string,
  message: string,
): Promise<string> {
  const kind = classifyPortalSyncFailure(portalType, message)
  const attention = authAttentionFromFailure(kind)
  if (attention !== 'none') {
    link.setAuthAttention(attention)
  } else {
    link.clearAuthAttention()
  }
  if (kind !== 'credentials_invalid') {
    link.clearSessionToken()
  }
  await linkRepo.update(link).catch(() => {})
  return userMessageForAuthFailure(portalType, kind, message)
}

export async function clearPortalSyncAuthAttention(
  link: IntegrationLink,
  linkRepo: IntegrationLinkRepository,
): Promise<void> {
  if (link.authAttention === 'none') return
  link.clearAuthAttention()
  await linkRepo.update(link).catch(() => {})
}
