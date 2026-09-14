import { describe, expect, it, vi } from 'vitest'
import { trackAvaTurnRecorded, trackAvaTurnFailed } from '../src/application/llm/ava-telemetry.js'
import type { ProductEventService } from '../src/application/telemetry/product-event.service.js'

describe('ava-telemetry', () => {
  it('records turn with intent and reflection metadata', async () => {
    const ingest = vi.fn(async () => ({ accepted: 1, rejected: 0 }))
    const service = { ingest } as unknown as ProductEventService
    await trackAvaTurnRecorded(service, {
      accountId: 'acc-1',
      patientId: 'pat-1',
      userMessage: 'resultado do hemograma',
      conversationId: 'conv-1',
      proposedActionCount: 2,
      hasAttachment: false,
      hasEntityPin: true,
    }, {
      reply: 'ok',
      provider: 'gemini',
      model: 'flash',
      tier: 'free',
      usage: { tokensIn: 1, tokensOut: 2, tokensTotal: 3, usageSource: 'metered' },
      quota: {} as never,
      disclaimer: '',
      insightsIncluded: 4,
      reflection: {
        satisfactory: false,
        issues: [],
        severity: 'minor',
        revised: true,
        attempts: 1,
        steps: [],
      },
      activityTrace: [],
    })
    expect(ingest).toHaveBeenCalledOnce()
    const event = ingest.mock.calls[0][1][0]
    expect(event.eventName).toBe('ava_turn_recorded')
    expect(event.properties?.intent_bucket).toBe('exam')
    expect(event.properties?.reflection_revised).toBe(true)
  })

  it('records quota failures as ava_quota_blocked', async () => {
    const ingest = vi.fn(async () => ({ accepted: 1, rejected: 0 }))
    const service = { ingest } as unknown as ProductEventService
    await trackAvaTurnFailed(service, {
      accountId: 'acc-1',
      patientId: 'pat-1',
      userMessage: 'oi',
      errorMessage: 'LLM_QUOTA_EXCEEDED',
    })
    expect(ingest.mock.calls[0][1][0].eventName).toBe('ava_quota_blocked')
  })
})
