import { describe, expect, it, vi } from 'vitest'
import { LlmMarkerFallbackExtractor } from '../src/application/exam-artifact/llm-marker-fallback.extractor.js'

vi.mock('../../src/infrastructure/llm/llm-router.js', () => ({
  LlmRouter: vi.fn(),
}))

describe('LlmMarkerFallbackExtractor (metering + catálogo)', () => {
  it('registra chamada e retorna marcadores quando LLM responde', async () => {
    // Mocks de repositório via pool fake
    const queries: string[] = []
    const pool = {
      query: vi.fn(async (sql: unknown) => {
        const s = String(sql)
        queries.push(s.slice(0, 60))
        if (s.includes('FROM llm_internal_budget')) return { rows: [{ scope_id: 'internal-operations', monthly_cost_cents: 0, monthly_period: '2026-08' }] }
        if (s.includes('INSERT INTO llm_internal_budget')) return { rows: [{ scope_id: 'internal-operations', monthly_cost_cents: 0, monthly_period: '2026-08' }] }
        if (s.includes('UPDATE llm_internal_budget')) return { rows: [{ scope_id: 'internal-operations', monthly_cost_cents: 1, monthly_period: '2026-08' }] }
        if (s.includes('llm_usage_events')) return { rows: [{ id: 'evt-1' }] }
        if (s.includes('semantic_catalog_cache')) return { rows: [] }
        return { rows: [] }
      }),
    } as never

    const extractor = new LlmMarkerFallbackExtractor(pool, { trigger: 'test' })

    // Injeta router fake
    const router = extractor['router'] as unknown as { completeJson: ReturnType<typeof vi.fn> }
    router.completeJson = vi.fn(async () => ({
      text: JSON.stringify([
        { markerName: 'Hemoglobina', numericValue: 11.6, displayValue: '11,6', unit: 'g/dL', status: 'normal' },
      ]),
      provider: 'opencode-zen',
      model: 'deepseek-v4-flash-free',
      tier: 'free',
      usage: { tokensIn: 100, tokensOut: 50, tokensTotal: 150, usageSource: 'api' as const },
    }))

    const out = await extractor.extractMarkers('HEMOGRAMA ... Coleta:\n31/10/2022 - 11:18:44')
    expect(out.markers).toHaveLength(1)
    expect(out.markers[0].markerName).toBe('Hemoglobina')
    expect(out.skipReason).toBeUndefined()
    expect(router.completeJson).toHaveBeenCalledOnce()
    // Deve ter gravado evento de uso
    expect(queries.some((q) => q.includes('llm_usage_events'))).toBe(true)
    // Deve ter gravado no catálogo semântico
    expect(queries.some((q) => q.includes('semantic_catalog_cache'))).toBe(true)
  })
})
