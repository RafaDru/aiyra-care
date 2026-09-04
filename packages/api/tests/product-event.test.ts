import { describe, expect, it, vi } from 'vitest'
import {
  sanitizeProductEventProperties,
  PRODUCT_EVENT_NAME_SET,
} from '../src/domain/telemetry/product-event.js'
import { ProductEventService } from '../src/application/telemetry/product-event.service.js'

describe('sanitizeProductEventProperties', () => {
  it('keeps allowlisted keys and drops PHI-like keys', () => {
    const out = sanitizeProductEventProperties({
      duration_ms: 1200,
      conversation_id: 'conv-1',
      message: 'febre alta',
      error_code: 'LLM_QUOTA_EXCEEDED',
      body: 'secret',
    })
    expect(out).toEqual({
      duration_ms: 1200,
      conversation_id: 'conv-1',
      error_code: 'LLM_QUOTA_EXCEEDED',
    })
  })

  it('rejects long string values', () => {
    const out = sanitizeProductEventProperties({
      error_code: 'x'.repeat(200),
    })
    expect(out).toEqual({})
  })
})

describe('ProductEventService.ingest', () => {
  it('filters unknown event names', async () => {
    const repo = { insertMany: vi.fn(async () => []) }
    const svc = new ProductEventService(repo as never)
    const result = await svc.ingest('acc-1', [
      { eventName: 'ava_chat_started' },
      { eventName: 'unknown_event' as never },
    ])
    expect(result.accepted).toBe(1)
    expect(result.rejected).toBe(1)
    expect(repo.insertMany).toHaveBeenCalledOnce()
  })
})

describe('PRODUCT_EVENT_NAME_SET', () => {
  it('includes ava, sync and instrumentation events', () => {
    expect(PRODUCT_EVENT_NAME_SET.has('ava_chat_completed')).toBe(true)
    expect(PRODUCT_EVENT_NAME_SET.has('sync_job_terminal')).toBe(true)
    expect(PRODUCT_EVENT_NAME_SET.has('sync_job_started')).toBe(true)
    expect(PRODUCT_EVENT_NAME_SET.has('app_screen_viewed')).toBe(true)
    expect(PRODUCT_EVENT_NAME_SET.has('family_invite_created')).toBe(true)
    expect(PRODUCT_EVENT_NAME_SET.has('landing_page_view')).toBe(true)
  })
})
