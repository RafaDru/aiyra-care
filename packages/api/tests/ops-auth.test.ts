import { describe, expect, it } from 'vitest'
import { isOpsKeyAuthorized, isOpsRoute, resolveOpsMetricsKey } from '../src/infrastructure/http/ops/ops-auth.js'

describe('ops-auth', () => {
  it('recognizes ops routes', () => {
    expect(isOpsRoute('/ops/metrics')).toBe(true)
    expect(isOpsRoute('/ops/alerts')).toBe(true)
    expect(isOpsRoute('/ops/alerts/check')).toBe(true)
    expect(isOpsRoute('/ops/dev-audit-bridge')).toBe(true)
    expect(isOpsRoute('/patients')).toBe(false)
  })

  it('authorizes valid x-internal-ops-key', () => {
    process.env.OPS_METRICS_KEY = 'test-ops-key'
    const req = { headers: { 'x-internal-ops-key': 'test-ops-key' } }
    expect(isOpsKeyAuthorized(req as never)).toBe(true)
    expect(isOpsKeyAuthorized({ headers: {} } as never)).toBe(false)
    delete process.env.OPS_METRICS_KEY
  })

  it('resolveOpsMetricsKey falls back to LLM_INTERNAL_OBSERVABILITY_KEY', () => {
    process.env.LLM_INTERNAL_OBSERVABILITY_KEY = 'llm-key'
    expect(resolveOpsMetricsKey()).toBe('llm-key')
    delete process.env.LLM_INTERNAL_OBSERVABILITY_KEY
  })
})
