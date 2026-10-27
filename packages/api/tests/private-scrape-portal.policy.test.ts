import { describe, it, expect } from 'vitest'
import {
  isPrivateScrapeAllowedInDeployment,
  isPrivateScrapePortal,
} from '../src/domain/connect/private-scrape-portal.policy.js'

describe('private-scrape-portal.policy', () => {
  it('classifies payer/provider portals', () => {
    expect(isPrivateScrapePortal('unimed')).toBe(true)
    expect(isPrivateScrapePortal('conectesus')).toBe(false)
  })

  it('blocks production tier by default', () => {
    expect(
      isPrivateScrapeAllowedInDeployment({ DEPLOYMENT_TIER: 'production' }),
    ).toBe(false)
  })

  it('allows preview and integration tiers', () => {
    expect(isPrivateScrapeAllowedInDeployment({ DEPLOYMENT_TIER: 'preview' })).toBe(true)
    expect(isPrivateScrapeAllowedInDeployment({ DEPLOYMENT_TIER: 'integration' })).toBe(true)
  })

  it('honors CONNECT_PRIVATE_SCRAPE_ENABLED override', () => {
    expect(
      isPrivateScrapeAllowedInDeployment({
        DEPLOYMENT_TIER: 'production',
        CONNECT_PRIVATE_SCRAPE_ENABLED: '1',
      }),
    ).toBe(true)
    expect(
      isPrivateScrapeAllowedInDeployment({
        DEPLOYMENT_TIER: 'integration',
        CONNECT_PRIVATE_SCRAPE_ENABLED: '0',
      }),
    ).toBe(false)
  })

  it('allows showcase mode in production', () => {
    expect(
      isPrivateScrapeAllowedInDeployment({
        DEPLOYMENT_TIER: 'production',
        CONNECT_SHOWCASE_MODE: '1',
      }),
    ).toBe(true)
  })
})
