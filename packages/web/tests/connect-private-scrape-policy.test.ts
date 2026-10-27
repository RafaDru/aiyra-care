import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  applyPrivateScrapeCatalogPolicy,
  isPrivateScrapeUiEnabled,
} from '../src/lib/connect-private-scrape-policy.ts'
import type { IntegrationOption } from '../src/components/integrations/integration-catalog.ts'

const unimed: IntegrationOption = {
  id: 'unimed',
  groupId: 'health',
  brand: 'unimed',
  title: 'Unimed',
  description: 'x',
  action: 'link',
  portalType: 'unimed',
  enabled: true,
}

describe('connect-private-scrape-policy', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('disables private portals when production tier', () => {
    vi.stubEnv('VITE_DEPLOYMENT_TIER', 'production')
    expect(isPrivateScrapeUiEnabled()).toBe(false)
    const patched = applyPrivateScrapeCatalogPolicy(unimed)
    expect(patched.enabled).toBe(false)
    expect(patched.disabledReason).toContain('demonstração')
  })

  it('keeps SUS options enabled in production', () => {
    vi.stubEnv('VITE_DEPLOYMENT_TIER', 'production')
    const sus: IntegrationOption = {
      id: 'conectesus',
      groupId: 'public',
      brand: 'conectesus',
      title: 'SUS',
      description: 'x',
      action: 'conectesus',
      enabled: true,
    }
    expect(applyPrivateScrapeCatalogPolicy(sus).enabled).toBe(true)
  })
})
