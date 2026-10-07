import { describe, expect, it } from 'vitest'
import {
  apiPathMatchesIncidentPrefixes,
  inferServerErrorBridgeFeature,
  isClientErrorSreLaneTier,
  resolveBridgeIngressFeature,
  resolveClientErrorIncidentBridgeConfig,
  ruleForFeature,
  shouldEnqueueClientErrorIncident,
} from '../src/domain/ops/client-error-incident-bridge.config.js'
import { sanitizeClientErrorFeature } from '../src/domain/telemetry/client-error.js'

describe('resolveClientErrorIncidentBridgeConfig', () => {
  it('defaults when env empty', () => {
    const cfg = resolveClientErrorIncidentBridgeConfig({})
    expect(cfg.enabled).toBe(false)
    expect(cfg.dedupeMs).toBe(15 * 60 * 1000)
    expect(cfg.minCount).toBe(1)
    expect(cfg.features.has('account_settings')).toBe(true)
    expect(cfg.features.has('onboarding')).toBe(true)
    expect(cfg.features.has('patient_integrations')).toBe(true)
    expect(cfg.features.has('integrations')).toBe(true)
    expect(cfg.features.has('integration_links')).toBe(true)
    expect(cfg.features.has('ava_companion')).toBe(true)
    expect(cfg.disabledFeatures.has('ava_companion')).toBe(true)
    expect(cfg.apiPathPrefixes).toEqual(['/auth', '/account', '/patients', '/integration-links'])
  })

  it('defaults disabled ava_companion for bridge INC (decision 3A)', () => {
    const cfg = resolveClientErrorIncidentBridgeConfig({
      CLIENT_ERROR_INCIDENT_FEATURES: 'ava_companion,ui',
    })
    expect(ruleForFeature(cfg, 'ava_companion')).toBeNull()
    expect(ruleForFeature(cfg, 'api:ava')).toBeNull()
    expect(ruleForFeature(cfg, 'ui')).not.toBeNull()
  })

  it('allows bridge INC for ava when disabled list cleared', () => {
    const cfg = resolveClientErrorIncidentBridgeConfig({
      CLIENT_ERROR_INCIDENT_FEATURES: 'ava_companion',
      CLIENT_ERROR_INCIDENT_FEATURES_DISABLED: 'none',
    })
    expect(cfg.disabledFeatures.has('ava_companion')).toBe(false)
    expect(ruleForFeature(cfg, 'ava_companion')?.feature).toBe('ava_companion')
  })

  it('parses CLIENT_ERROR_INCIDENT_FEATURES_DISABLED csv', () => {
    const cfg = resolveClientErrorIncidentBridgeConfig({
      CLIENT_ERROR_INCIDENT_FEATURES: 'ava_companion,ui',
      CLIENT_ERROR_INCIDENT_FEATURES_DISABLED: 'ui,patient_wallet',
    })
    expect(ruleForFeature(cfg, 'ui')).toBeNull()
    expect(ruleForFeature(cfg, 'ava_companion')?.feature).toBe('ava_companion')
  })

  it('parses enable flag and feature list', () => {
    const cfg = resolveClientErrorIncidentBridgeConfig({
      CLIENT_ERROR_INCIDENT_BRIDGE_ENABLED: '1',
      CLIENT_ERROR_INCIDENT_FEATURES: 'dashboard,ui',
      CLIENT_ERROR_INCIDENT_DEDUPE_MS: '3600000',
      CLIENT_ERROR_INCIDENT_API_PREFIXES: '/auth,/billing',
    })
    expect(cfg.enabled).toBe(true)
    expect(cfg.features.has('dashboard')).toBe(true)
    expect(cfg.features.has('ui')).toBe(true)
    expect(cfg.features.has('account_settings')).toBe(false)
    expect(cfg.dedupeMs).toBe(3600000)
    expect(cfg.apiPathPrefixes).toEqual(['/auth', '/billing'])
  })
})

describe('ruleForFeature', () => {
  it('returns development_support lane by default', () => {
    const cfg = resolveClientErrorIncidentBridgeConfig({
      CLIENT_ERROR_INCIDENT_FEATURES: 'ui',
    })
    const rule = ruleForFeature(cfg, 'ui')
    expect(rule?.lane).toBe('development_support')
  })
})

describe('apiPathMatchesIncidentPrefixes', () => {
  it('matches configured prefixes only', () => {
    const cfg = resolveClientErrorIncidentBridgeConfig({})
    expect(apiPathMatchesIncidentPrefixes('/auth/login', cfg)).toBe(true)
    expect(apiPathMatchesIncidentPrefixes('/integration-links/abc/sync', cfg)).toBe(true)
    expect(apiPathMatchesIncidentPrefixes('/telemetry/client-errors', cfg)).toBe(false)
  })
})

describe('resolveBridgeIngressFeature', () => {
  it('infers integration_links from sync API path', () => {
    expect(inferServerErrorBridgeFeature('/integration-links/link-1/sync')).toBe('integration_links')
    expect(sanitizeClientErrorFeature('integration_links')).toBe('integration_links')
  })

  it('maps complete-profile auth API to onboarding bridge feature', () => {
    expect(
      resolveBridgeIngressFeature('api:auth', { api_path: '/auth/complete-profile' }),
    ).toBe('onboarding')
    expect(resolveBridgeIngressFeature('api:auth', { api_path: '/auth/sync' })).toBe('account_settings')
    expect(inferServerErrorBridgeFeature('/auth/complete-profile')).toBe('onboarding')
    expect(inferServerErrorBridgeFeature('/auth/sync')).toBe('account_settings')
  })

  it('maps mobile and API telemetry keys to bridge allowlist', () => {
    expect(resolveBridgeIngressFeature('mobile_shell')).toBe('ui')
    expect(resolveBridgeIngressFeature('api:patients:exams')).toBe('patient_exams')
    expect(resolveBridgeIngressFeature('api:integration_links')).toBe('patient_integrations')
    expect(resolveBridgeIngressFeature('api:ava')).toBe('ava_companion')
    expect(
      resolveBridgeIngressFeature('api', { api_path: '/patients/p1/ava/chat' }),
    ).toBe('ava_companion')
  })

  it('routes integration_links to sre_support only on production tier (4B)', () => {
    const cfg = resolveClientErrorIncidentBridgeConfig({
      CLIENT_ERROR_INCIDENT_FEATURES: 'integration_links,patient_integrations',
      CLIENT_ERROR_INCIDENT_SRE_FEATURES: 'integration_links',
    })
    expect(ruleForFeature(cfg, 'integration_links', undefined, { deploymentTier: 'integration' })?.lane).toBe(
      'development_support',
    )
    expect(ruleForFeature(cfg, 'integration_links', undefined, { deploymentTier: 'preview' })?.lane).toBe(
      'development_support',
    )
    expect(ruleForFeature(cfg, 'integration_links', undefined, { deploymentTier: 'production' })?.lane).toBe(
      'sre_support',
    )
    expect(
      ruleForFeature(cfg, 'api:integration_links', undefined, { deploymentTier: 'production' })?.lane,
    ).toBe('sre_support')
  })
})

describe('shouldEnqueueClientErrorIncident', () => {
  it('skips api.client probes (business 4xx)', () => {
    expect(
      shouldEnqueueClientErrorIncident('HTTP_409', { probe_kind: 'api.client' }),
    ).toBe(false)
    expect(
      shouldEnqueueClientErrorIncident('HTTP_400', { probe_kind: 'api.client' }),
    ).toBe(false)
    expect(
      shouldEnqueueClientErrorIncident('HTTP_404', { probe_kind: 'api.client' }),
    ).toBe(false)
  })

  it('skips HTTP_400 and HTTP_409 without probe_kind (legacy ingest)', () => {
    expect(shouldEnqueueClientErrorIncident('HTTP_409', {})).toBe(false)
    expect(shouldEnqueueClientErrorIncident('HTTP_400', undefined)).toBe(false)
  })

  it('keeps technical probes enqueueable', () => {
    expect(
      shouldEnqueueClientErrorIncident('HTTP_500', { probe_kind: 'api.unexpected' }),
    ).toBe(true)
    expect(shouldEnqueueClientErrorIncident('HTTP_502', {})).toBe(true)
    expect(
      shouldEnqueueClientErrorIncident('ChunkLoadError', { probe_kind: 'ui.unhandled' }),
    ).toBe(true)
    expect(shouldEnqueueClientErrorIncident('NETWORK', {})).toBe(true)
  })
})

describe('isClientErrorSreLaneTier', () => {
  it('accepts production and prod aliases', () => {
    expect(isClientErrorSreLaneTier('production')).toBe(true)
    expect(isClientErrorSreLaneTier('prod')).toBe(true)
    expect(isClientErrorSreLaneTier('preview')).toBe(false)
    expect(isClientErrorSreLaneTier({ DEPLOYMENT_TIER: 'production' })).toBe(true)
  })
})
