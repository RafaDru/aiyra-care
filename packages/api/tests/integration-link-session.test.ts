import { describe, it, expect } from 'vitest'
import { IntegrationLink } from '../src/domain/integration-link/integration-link.entity.js'
import { isIntegrationLinkSessionReady } from '../src/application/integration-link/integration-link-session.js'

function linkWithSession(portalType: string, expiresAt: Date): IntegrationLink {
  return IntegrationLink.create({
    patientId: 'p1',
    portalType,
    encryptedSessionToken: 'enc',
    sessionExpiresAt: expiresAt,
  })
}

describe('integration-link-session', () => {
  it('returns false without token or expiry', () => {
    const link = IntegrationLink.create({ patientId: 'p1', portalType: 'unimed' })
    expect(isIntegrationLinkSessionReady(link)).toBe(false)
  })

  it('returns true when session expires in the future', () => {
    const link = linkWithSession('amil', new Date(Date.now() + 3600_000))
    expect(isIntegrationLinkSessionReady(link)).toBe(true)
  })

  it('returns false when session expired', () => {
    const link = linkWithSession('mater_dei', new Date(Date.now() - 1000))
    expect(isIntegrationLinkSessionReady(link)).toBe(false)
  })

  it('accepts override expiresAt', () => {
    const link = IntegrationLink.create({ patientId: 'p1', portalType: 'unimed' })
    expect(isIntegrationLinkSessionReady(link, new Date(Date.now() + 3600_000))).toBe(false)
    const withToken = linkWithSession('unimed', new Date(Date.now() + 3600_000))
    expect(isIntegrationLinkSessionReady(withToken, new Date(Date.now() - 1000))).toBe(false)
  })
})
