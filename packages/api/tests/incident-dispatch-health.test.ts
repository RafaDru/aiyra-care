import { describe, expect, it } from 'vitest'
import { resolveIncidentDispatchWebhookFlags } from '../src/application/ops/incident-dispatch-health.js'

describe('resolveIncidentDispatchWebhookFlags', () => {
  it('reports missing when env empty', () => {
    const flags = resolveIncidentDispatchWebhookFlags({} as NodeJS.ProcessEnv)
    expect(flags.developmentSupport.ready).toBe(false)
    expect(flags.sreSupport.ready).toBe(false)
  })

  it('reports ready when url and key present', () => {
    const flags = resolveIncidentDispatchWebhookFlags({
      CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_URL: 'https://example.com/hook',
      CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_KEY: 'k',
      CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_URL: 'https://example.com/sre',
      CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_KEY: 'k2',
    } as NodeJS.ProcessEnv)
    expect(flags.developmentSupport.ready).toBe(true)
    expect(flags.sreSupport.ready).toBe(true)
  })
})
