import { describe, expect, it, vi } from 'vitest'
import { UnifiedSemanticClassifierService } from '../src/application/semantic-classification/unified-semantic-classifier.service.js'
import type {
  SemanticCacheEntry,
  SemanticCacheRepositoryPort,
  SemanticCatalogEntry,
} from '../src/domain/semantic-classification/semantic-classification.types.js'

describe('UnifiedSemanticClassifierService', () => {
  const staticCatalog: Array<SemanticCatalogEntry<string, string>> = [
    {
      id: 'HEMOGRAMA',
      canonicalName: 'Hemograma Completo',
      kind: 'exame',
      destination: 'exam',
      aliases: ['HEMOGRAMA', 'HEMOGRAMA COMPLETO COM PLAQUETAS'],
    },
    {
      id: 'CONSULTA_PS',
      canonicalName: 'Consulta em Pronto Socorro',
      kind: 'pronto-socorro',
      destination: 'medical_record',
      aliases: ['CONSULTA EM PRONTO SOCORRO', 'ATENDIMENTO PS PEDIATRICO'],
    },
  ]

  it('Tier 1: classifies via vector embedding similarity when confidence >= threshold', async () => {
    const service = new UnifiedSemanticClassifierService({
      domain: 'health_label',
      acceptableVectorThreshold: 0.80,
      staticCatalog,
    })

    const result = await service.classify('10101039 - Consulta em Pronto Socorro')
    expect(result.method).toBe('exact')
    expect(result.kind).toBe('pronto-socorro')
    expect(result.confidence).toBeGreaterThanOrEqual(0.80)
    expect(result.canonicalName).toBe('Consulta em Pronto Socorro')
  })

  it('Tier 2 & 3: falls back to LLM when vector confidence < threshold, then auto-categorizes into dynamic catalog cache', async () => {
    const memoryCache = new Map<string, SemanticCacheEntry>()
    const mockCacheRepo: SemanticCacheRepositoryPort = {
      async findByNormalizedLabel(domain, norm) {
        return memoryCache.get(`${domain}:${norm}`) ?? null
      },
      async saveOrIncrement(entry) {
        const item: SemanticCacheEntry = {
          id: 'mock-uuid',
          domain: entry.domain,
          rawLabel: entry.rawLabel,
          normalizedLabel: entry.normalizedLabel,
          kind: entry.kind,
          destination: entry.destination,
          canonicalName: entry.canonicalName,
          catalogId: entry.catalogId,
          confidence: entry.confidence,
          sourceMethod: entry.sourceMethod,
          timesHit: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        memoryCache.set(`${entry.domain}:${entry.normalizedLabel}`, item)
        return item
      },
      async findAllByDomain(domain) {
        return Array.from(memoryCache.values()).filter((x) => x.domain === domain)
      },
    }

    const mockLlm = vi.fn().mockResolvedValue({
      kind: 'teleconsulta',
      destination: 'medical_record',
      canonicalName: 'Telemedicina / Telessaúde',
      catalogId: 'TELESSAUDE_SPEC',
      reason: 'Identificado via LLM',
    })

    const service = new UnifiedSemanticClassifierService({
      domain: 'health_label',
      acceptableVectorThreshold: 0.85,
      staticCatalog,
      cacheRepo: mockCacheRepo,
      llmFallback: mockLlm,
    })

    // 1ª Chamada: Rótulo ambíguo -> Vetor < 0.85 -> Dispara LLM -> Auto-Categoriza na base dinâmica
    const res1 = await service.classify('90131700 - TELESSAÚDE PEDIÁTRICA URGENTE')
    expect(mockLlm).toHaveBeenCalledOnce()
    expect(res1.method).toBe('llm')
    expect(res1.kind).toBe('teleconsulta')
    expect(res1.canonicalName).toBe('Telemedicina / Telessaúde')

    // 2ª Chamada: Mesmo rótulo -> Bate no Catálogo Dinâmico (Tier 1 Cache) -> Retorna instantaneamente sem chamar LLM novamente!
    const res2 = await service.classify('90131700 - TELESSAÚDE PEDIÁTRICA URGENTE')
    expect(mockLlm).toHaveBeenCalledOnce() // Continua 1 (não chamou LLM novamente)
    expect(res2.method).toBe('cache')
    expect(res2.kind).toBe('teleconsulta')
    expect(res2.confidence).toBe(1.0)
    expect(res2.reason).toContain('Hit do catálogo dinâmico')
  })
})
