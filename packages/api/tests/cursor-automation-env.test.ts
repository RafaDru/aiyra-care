import { afterEach, describe, expect, it } from 'vitest'
import {
  cleanCursorAutomationKey,
  resolveDevelopmentSupportAutomationWebhookKey,
  resolveDevelopmentSupportAutomationWebhookUrl,
  resolveSreSupportAutomationWebhookKey,
  resolveSreSupportAutomationWebhookUrl,
} from '../src/domain/ops/cursor-automation-env.js'

describe('cursor-automation-env', () => {
  afterEach(() => {
    for (const key of [
      'CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_URL',
      'CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_KEY',
      'CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_URL',
      'CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_KEY',
      'CURSOR_SUPPORT_AUTOMATION_WEBHOOK_URL',
      'CURSOR_SUPPORT_AUTOMATION_WEBHOOK_KEY',
      'CURSOR_OPS_ALERT_AUTOMATION_WEBHOOK_URL',
      'CURSOR_OPS_ALERT_AUTOMATION_WEBHOOK_KEY',
    ]) {
      delete process.env[key]
    }
  })

  it('prefers canonical development support env names', () => {
    process.env.CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_URL = 'https://dev.test/hook'
    process.env.CURSOR_SUPPORT_AUTOMATION_WEBHOOK_URL = 'https://legacy.test/hook'
    expect(resolveDevelopmentSupportAutomationWebhookUrl()).toBe('https://dev.test/hook')
  })

  it('prefers canonical SRE env names', () => {
    process.env.CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_URL = 'https://sre.test/hook'
    process.env.CURSOR_OPS_ALERT_AUTOMATION_WEBHOOK_URL = 'https://legacy.test/hook'
    expect(resolveSreSupportAutomationWebhookUrl()).toBe('https://sre.test/hook')
  })

  it('does not reuse development key when SRE URL is dedicated', () => {
    process.env.CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_URL = 'https://sre.test/hook'
    process.env.CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_KEY = 'crsr_dev'
    expect(resolveSreSupportAutomationWebhookKey()).toBeUndefined()
  })

  it('cleans Authorization Bearer prefix from keys', () => {
    expect(cleanCursorAutomationKey('Authorization Bearer crsr_abc')).toBe('crsr_abc')
  })
})
