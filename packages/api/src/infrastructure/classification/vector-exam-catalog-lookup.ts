/**
 * Adapter do lookup de catálogo usando Embeddings Vetoriais (Cosseno + N-Gram).
 * Implementa o port `ExamCatalogLookup` do domínio com pontuação de confiança vetorial.
 */

import {
  EXAM_CATALOG,
  type CatalogEntry,
  type ExamCatalogLookup,
} from '../../domain/classification/exam-catalog.js'
import { normalizeHealthLabel } from '../../domain/classification/label-classification.js'
import {
  findBestVectorMatch,
  type TermVector,
} from '../../domain/semantic-classification/vector-embedding.engine.js'
import type { SemanticCatalogEntry } from '../../domain/semantic-classification/semantic-classification.types.js'

// Mapeia o EXAM_CATALOG estático para o formato de entradas semânticas
const SEMANTIC_EXAM_CATALOG: Array<SemanticCatalogEntry<'exame', 'exam'>> = EXAM_CATALOG.map((e) => ({
  id: e.id,
  canonicalName: e.name,
  kind: 'exame',
  destination: 'exam',
  aliases: e.aliases,
}))

export class VectorExamCatalogLookup implements ExamCatalogLookup {
  private readonly catalog: Array<SemanticCatalogEntry<'exame', 'exam'>>

  constructor(customCatalog?: Array<SemanticCatalogEntry<'exame', 'exam'>>) {
    this.catalog = customCatalog ?? SEMANTIC_EXAM_CATALOG
  }

  byAlias(rawLabel: string): { entry: CatalogEntry; method: 'exact' | 'synonym' | 'acronym' } | null {
    const norm = normalizeHealthLabel(rawLabel)
    if (!norm) return null

    const match = findBestVectorMatch(rawLabel, this.catalog, { minThreshold: 0.98 })
    if (match && match.confidence >= 0.98) {
      const origEntry = EXAM_CATALOG.find((x) => x.id === match.entry.id)
      if (origEntry) {
        return { entry: origEntry, method: 'exact' }
      }
    }
    return null
  }

  bestFuzzy(
    rawLabel: string,
    threshold: number,
  ): { entry: CatalogEntry; similarity: number; distance: number } | null {
    const match = findBestVectorMatch(rawLabel, this.catalog, { minThreshold: threshold })
    if (!match) return null

    const origEntry = EXAM_CATALOG.find((x) => x.id === match.entry.id) ?? {
      id: match.entry.id,
      name: match.entry.canonicalName,
      aliases: match.entry.aliases,
    }

    return {
      entry: origEntry,
      similarity: match.similarity,
      distance: 1 - match.similarity,
    }
  }
}
