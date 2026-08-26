import { describe, it, expect, afterEach } from 'vitest'
import { isLlmQuotaBypassed } from '../src/domain/llm/llm-quota-bypass.js'

describe('llm-quota-bypass', () => {
  const env = process.env

  afterEach(() => {
    process.env = { ...env }
  })

  it('bypasses by account id', () => {
    process.env.LLM_QUOTA_BYPASS_ACCOUNT_IDS = 'acc-1, acc-2'
    expect(isLlmQuotaBypassed('acc-1')).toBe(true)
    expect(isLlmQuotaBypassed('acc-3')).toBe(false)
  })

  it('bypasses by email', () => {
    process.env.LLM_QUOTA_BYPASS_EMAILS = 'Rafael@Example.com'
    expect(isLlmQuotaBypassed('other', 'rafael@example.com')).toBe(true)
  })

  it('bypasses globally when unlimited', () => {
    process.env.LLM_QUOTA_UNLIMITED = '1'
    expect(isLlmQuotaBypassed('any')).toBe(true)
  })
})
