import { describe, expect, it } from 'vitest'
import {
  computeVectorEmbedding,
  cosineSimilarity,
  findBestVectorMatch,
} from '../src/domain/semantic-classification/vector-embedding.engine.js'
import type { SemanticCatalogEntry } from '../src/domain/semantic-classification/semantic-classification.types.js'

describe('VectorEmbeddingEngine', () => {
  it('computes term vector and norm correctly', () => {
    const emb = computeVectorEmbedding('Hemograma Completo com Plaquetas')
    expect(emb.norm).toBeGreaterThan(0)
    expect(emb.vector.size).toBeGreaterThan(5)
  })

  it('calculates 1.0 cosine similarity for identical texts', () => {
    const emb1 = computeVectorEmbedding('Hemograma Completo')
    const emb2 = computeVectorEmbedding('Hemograma Completo')
    const sim = cosineSimilarity(emb1, emb2)
    expect(sim).toBeCloseTo(1.0, 2)
  })

  it('calculates high cosine similarity for morphological variations and TUSS codes', () => {
    const emb1 = computeVectorEmbedding('40304361 - Hemograma Completo com Plaquetas')
    const emb2 = computeVectorEmbedding('Hemograma com Plaquetas')
    const sim = cosineSimilarity(emb1, emb2)
    expect(sim).toBeGreaterThan(0.70)
  })

  it('calculates low similarity for completely unrelated medical terms', () => {
    const emb1 = computeVectorEmbedding('Hemograma Completo')
    const emb2 = computeVectorEmbedding('Ressonância Magnética do Joelho')
    const sim = cosineSimilarity(emb1, emb2)
    expect(sim).toBeLessThan(0.30)
  })

  it('finds best vector match in catalog with confidence score', () => {
    const catalog: Array<SemanticCatalogEntry<'exame', 'exam'>> = [
      {
        id: 'HEMOGRAMA',
        canonicalName: 'Hemograma',
        kind: 'exame',
        destination: 'exam',
        aliases: ['HEMOGRAMA', 'HEMOGRAMA COMPLETO', 'HEMOGRAMA COM PLAQUETAS'],
      },
      {
        id: 'GLICOSE',
        canonicalName: 'Glicose',
        kind: 'exame',
        destination: 'exam',
        aliases: ['GLICOSE', 'GLICEMIA DE JEJUM'],
      },
    ]

    const match = findBestVectorMatch('10101012 - Hemograma com Plaquetas', catalog)
    expect(match).not.toBeNull()
    expect(match!.entry.id).toBe('HEMOGRAMA')
    expect(match!.confidence).toBeGreaterThanOrEqual(0.75)
    expect(match!.similarity).toBeGreaterThanOrEqual(0.75)
  })
})
