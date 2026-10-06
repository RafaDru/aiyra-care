import { describe, expect, it } from 'vitest'
import {
  apiPathMatchesIncidentPrefixes,
  resolveClientErrorIncidentBridgeConfig,
  ruleForFeature,
} from '../src/domain/ops/client-error-incident-bridge.config.js'

describe('resolveClientErrorIncidentBridgeConfig', () => {
  it('defaults when env empty', () => {
    const cfg = resolveClientErrorIncidentBridgeConfig({})
    expect(cfg.enabled).toBe(false)
    expect(cfg.dedupeMs).toBe(15 * 60 * 1000)
    expect(cfg.minCount).toBe(1)
    expect(cfg.features.has('account_settings')).toBe(true)
    expect(cfg.features.has('patient_integrations')).toBe(true)
    expect(cfg.features.has('integrations')).toBe(true)
    expect(cfg.apiPathPrefixes).toEqual(['/auth', '/account', '/patients'])
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
    expect(apiPathMatchesIncidentPrefixes('/telemetry/client-errors', cfg)).toBe(false)
  })
})
