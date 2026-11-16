import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  extractBearerToken,
  isLoopbackHost,
  isOpsConsoleAuthExempt,
  isOpsConsoleStaticAssetPath,
  isOperatorEmailAllowlisted,
  parseOperatorEmailAllowlist,
  resetOpsConsoleAuthAdapterCacheForTests,
  resolveOpsConsoleAuthEnabled,
} from '../../ops-console/src/operator-auth.js'

describe('ops-console operator auth', () => {
  afterEach(() => {
    delete process.env.OPS_CONSOLE_AUTH_ENABLED
    delete process.env.OPS_CONSOLE_OPERATOR_EMAILS
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE
    resetOpsConsoleAuthAdapterCacheForTests()
    vi.restoreAllMocks()
  })

  it('defaults auth on for preview/production, off for integration', () => {
    expect(resolveOpsConsoleAuthEnabled('preview', '127.0.0.1')).toBe(true)
    expect(resolveOpsConsoleAuthEnabled('production', '127.0.0.1')).toBe(true)
    expect(resolveOpsConsoleAuthEnabled('integration', '127.0.0.1')).toBe(false)
  })

  it('honors OPS_CONSOLE_AUTH_ENABLED=0 only on loopback', () => {
    process.env.OPS_CONSOLE_AUTH_ENABLED = '0'
    expect(resolveOpsConsoleAuthEnabled('preview', '127.0.0.1')).toBe(false)
    expect(resolveOpsConsoleAuthEnabled('preview', '0.0.0.0')).toBe(true)
  })

  it('parses operator allowlist case-insensitively', () => {
    process.env.OPS_CONSOLE_OPERATOR_EMAILS = ' Rafael@Example.com , ops@ananeri.dev '
    const list = parseOperatorEmailAllowlist()
    expect(isOperatorEmailAllowlisted('rafael@example.com', list)).toBe(true)
    expect(isOperatorEmailAllowlisted('other@example.com', list)).toBe(false)
  })

  it('extracts bearer token', () => {
    expect(extractBearerToken('Bearer abc.def')).toBe('abc.def')
    expect(extractBearerToken('Basic x')).toBeNull()
  })

  it('recognizes loopback hosts', () => {
    expect(isLoopbackHost('127.0.0.1')).toBe(true)
    expect(isLoopbackHost('localhost')).toBe(true)
    expect(isLoopbackHost('0.0.0.0')).toBe(false)
  })

  it('exempts health, machine callbacks and github webhooks', () => {
    expect(isOpsConsoleAuthExempt({ method: 'GET', path: '/health' })).toBe(true)
    expect(
      isOpsConsoleAuthExempt({ method: 'POST', path: '/api/analysis-queue/callback' }),
    ).toBe(true)
    expect(
      isOpsConsoleAuthExempt({
        method: 'POST',
        path: '/api/analysis-queue/abc/triage-started',
      }),
    ).toBe(true)
    expect(
      isOpsConsoleAuthExempt({ method: 'POST', path: '/api/platform-defects/review-callback' }),
    ).toBe(true)
    expect(
      isOpsConsoleAuthExempt({ method: 'POST', path: '/api/webhooks/github/defect-ci' }),
    ).toBe(true)
    expect(isOpsConsoleAuthExempt({ method: 'GET', path: '/api/metrics' })).toBe(false)
  })

  it('treats vite asset paths as static', () => {
    expect(isOpsConsoleStaticAssetPath('/@vite/client')).toBe(true)
    expect(isOpsConsoleStaticAssetPath('/assets/index.js')).toBe(true)
    expect(isOpsConsoleStaticAssetPath('/')).toBe(false)
  })

  it('exempts auth status bootstrap route', () => {
    expect(isOpsConsoleAuthExempt({ method: 'GET', path: '/api/auth/status' })).toBe(true)
  })
})