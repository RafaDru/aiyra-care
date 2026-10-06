import { describe, expect, it } from 'vitest'
import {
  apiPathMatchesIncidentPrefixes,
  inferServerErrorBridgeFeature,
  resolveBridgeIngressFeature,
  resolveClientErrorIncidentBridgeConfig,
  ruleForFeature,
} from '../src/domain/ops/client-error-incident-bridge.config.js'
import { sanitizeClientErrorFeature } from '../src/domain/telemetry/client-error.js'

describe('resolveClientErrorIncidentBridgeConfig', () => {
  it('defaults when env empty', () => {
    const cfg = resolveClientErrorIncidentBridgeConfig({})
    expect(cfg.enabled).toBe(false)
    expect(cfg.dedupeMs).toBe(15 * 60 * 1000)
    expect(cfg.minCount).toBe(1)
    expect(cfg.features.has('account_settings')).toBe(true)
    expect(cfg.features.has('patient_integrations')).toBe(true)
    expect(cfg.features.has('integrations')).toBe(true)
    expect(cfg.features.has('integration_links')).toBe(true)
    expect(cfg.features.has('ava_companion')).toBe(true)
    expect(cfg.apiPathPrefixes).toEqual(['/auth', '/account', '/patients', '/integration-links'])
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

  it('maps mobile and API telemetry keys to bridge allowlist', () => {
    expect(resolveBridgeIngressFeature('mobile_shell')).toBe('ui')
    expect(resolveBridgeIngressFeature('api:patients:exams')).toBe('patient_exams')
    expect(resolveBridgeIngressFeature('api:integration_links')).toBe('patient_integrations')
    expect(resolveBridgeIngressFeature('api:ava')).toBe('ava_companion')
    expect(
      resolveBridgeIngressFeature('api', { api_path: '/patients/p1/ava/chat' }),
    ).toBe('ava_companion')
  })

  it('routes integration_links to sre_support when configured', () => {
    const cfg = resolveClientErrorIncidentBridgeConfig({
      CLIENT_ERROR_INCIDENT_FEATURES: 'integration_links',
      CLIENT_ERROR_INCIDENT_SRE_FEATURES: 'integration_links',
    })
    const rule = ruleForFeature(cfg, 'integration_links')
    expect(rule?.lane).toBe('sre_support')
  })
})
