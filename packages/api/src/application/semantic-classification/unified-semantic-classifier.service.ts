/**
 * Serviço Unificado de Classificação Semântica (3-Tier Pipeline).
 *
 * Arquitetura Reutilizável & Hexagonal:
 * 1. Tier 1: Embeddings Vetoriais (Cosseno + N-Gram) e Busca no Catálogo Dinâmico
 *    - Calcula a confiança vetorial em [0.0, 1.0].
 *    - Se similaridade >= acceptableThreshold (ex.: 0.80), retorna imediatamente com method: 'vector'.
 * 2. Tier 2: Fallback LLM para Rótulos Ambíguos
 *    - Se a similaridade vetorial for menor que o limite aceitável, chama o LLM.
 * 3. Tier 3: Auto-Categorização & Feedback Loop no Catálogo Dinâmico
 *    - Após a identificação pelo LLM, grava automaticamente a nova entrada na tabela
 *      `semantic_catalog_cache`. Buscas futuras desse ou de termos similares passam
 *      a dar hit vetorial/cache em 1ms sem custo de LLM.
 */

import { normalizeHealthLabel } from '../../domain/classification/label-classification.js'
import {
  findBestVectorMatch,
} from '../../domain/semantic-classification/vector-embedding.engine.js'
import type {
  SemanticCacheRepositoryPort,
  SemanticCatalogEntry,
  SemanticClassificationResult,
  SemanticDomain,
} from '../../domain/semantic-classification/semantic-classification.types.js'

export interface UnifiedSemanticClassifierOptions<TKind = string, TDest = string> {
  domain: SemanticDomain
  /** Limite aceitável de confiança vetorial (default: 0.80). Abaixo disso, dispara LLM. */
  acceptableVectorThreshold?: number
  /** Catálogo estático base (Semente / Tabela canônica). */
  staticCatalog?: Array<SemanticCatalogEntry<TKind, TDest>>
  /** Repositório de cache dinâmico em banco relacional. */
  cacheRepo?: SemanticCacheRepositoryPort
  /** Função/método de fallback para LLM. */
  llmFallback?: (
    rawLabel: string,
    normalizedLabel: string,
  ) => Promise<{
    kind: TKind
    destination: TDest
    canonicalName?: string
    catalogId?: string
    reason?: string
  } | null>
  /** Função de classificação padrão / heurística local fallback (ex.: por categorias). */
  localCategoryFallback?: (
    rawLabel: string,
    normalizedLabel: string,
  ) => {
    kind: TKind
    destination: TDest
    confidence: number
    reason: string
  }
}

export class UnifiedSemanticClassifierService<TKind = string, TDest = string> {
  private readonly domain: SemanticDomain
  private readonly acceptableVectorThreshold: number
  private readonly staticCatalog: Array<SemanticCatalogEntry<TKind, TDest>>
  private readonly cacheRepo?: SemanticCacheRepositoryPort
  private readonly llmFallback?: UnifiedSemanticClassifierOptions<TKind, TDest>['llmFallback']
  private readonly localCategoryFallback?: UnifiedSemanticClassifierOptions<TKind, TDest>['localCategoryFallback']

  constructor(opts: UnifiedSemanticClassifierOptions<TKind, TDest>) {
    this.domain = opts.domain
    this.acceptableVectorThreshold = opts.acceptableVectorThreshold ?? 0.80
    this.staticCatalog = opts.staticCatalog ?? []
    this.cacheRepo = opts.cacheRepo
    this.llmFallback = opts.llmFallback
    this.localCategoryFallback = opts.localCategoryFallback
  }

  async classify(rawLabel: string): Promise<SemanticClassificationResult<TKind, TDest>> {
    const normalizedLabel = normalizeHealthLabel(rawLabel)

    // --- TIER 1a: Cache Dinâmico no Banco (Hit de Aprendizados Anteriores do LLM) ---
    if (this.cacheRepo && normalizedLabel) {
      const cached = await this.cacheRepo.findByNormalizedLabel<TKind, TDest>(
        this.domain,
        normalizedLabel,
      )
      if (cached) {
        return {
          rawLabel,
          normalizedLabel,
          kind: cached.kind,
          destination: cached.destination,
          canonicalName: cached.canonicalName,
          catalogId: cached.catalogId,
          method: 'cache',
          confidence: 1.0,
          reason: `Hit do catálogo dinâmico (${cached.sourceMethod} prévio, hits: ${cached.timesHit})`,
        }
      }
    }

    // --- TIER 1b: Embeddings Vetoriais (Cosseno + N-Gram) no Catálogo Estático ---
    const activeCatalog = await this.buildCombinedCatalog()
    const vectorMatch = findBestVectorMatch(rawLabel, activeCatalog, {
      minThreshold: 0.50, // Avalia candidatos a partir de 0.50
    })

    if (vectorMatch && vectorMatch.confidence >= this.acceptableVectorThreshold) {
      return {
        rawLabel,
        normalizedLabel,
        kind: vectorMatch.entry.kind,
        destination: vectorMatch.entry.destination,
        canonicalName: vectorMatch.entry.canonicalName,
        catalogId: vectorMatch.entry.id,
        method: vectorMatch.confidence === 1.0 ? 'exact' : 'vector',
        confidence: vectorMatch.confidence,
        vectorSimilarity: vectorMatch.similarity,
        reason: `Vetor de similaridade ${vectorMatch.similarity.toFixed(2)} (>= limite ${this.acceptableVectorThreshold}) -> ${vectorMatch.entry.canonicalName}`,
      }
    }

    // --- TIER 2: Fallback LLM (Quando o vetor não atinge o limite aceitável) ---
    if (this.llmFallback && normalizedLabel) {
      const llmResult = await this.llmFallback(rawLabel, normalizedLabel).catch(() => null)

      if (llmResult) {
        // --- TIER 3: Auto-Categorização & Feedback Loop no Catálogo Dinâmico ---
        if (this.cacheRepo) {
          await this.cacheRepo
            .saveOrIncrement({
              domain: this.domain,
              rawLabel,
              normalizedLabel,
              kind: llmResult.kind,
              destination: llmResult.destination,
              canonicalName: llmResult.canonicalName,
              catalogId: llmResult.catalogId,
              confidence: 0.90,
              sourceMethod: 'llm',
            })
            .catch(() => {})
        }

        return {
          rawLabel,
          normalizedLabel,
          kind: llmResult.kind,
          destination: llmResult.destination,
          canonicalName: llmResult.canonicalName,
          catalogId: llmResult.catalogId,
          method: 'llm',
          confidence: 0.90,
          reason: llmResult.reason ?? 'Classificado via LLM (auto-salvo no catálogo dinâmico)',
        }
      }
    }

    // --- TIER 1c: Melhor Match Vetorial Sub-Threshold (se a confiança for razoável, ex. >= 0.60) ---
    if (vectorMatch && vectorMatch.confidence >= 0.60) {
      return {
        rawLabel,
        normalizedLabel,
        kind: vectorMatch.entry.kind,
        destination: vectorMatch.entry.destination,
        canonicalName: vectorMatch.entry.canonicalName,
        catalogId: vectorMatch.entry.id,
        method: 'vector',
        confidence: vectorMatch.confidence,
        vectorSimilarity: vectorMatch.similarity,
        reason: `Vetor parcial ${vectorMatch.similarity.toFixed(2)} -> ${vectorMatch.entry.canonicalName}`,
      }
    }

    // --- Fallback Local de Categoria ou Genérico ---
    if (this.localCategoryFallback && normalizedLabel) {
      const local = this.localCategoryFallback(rawLabel, normalizedLabel)
      return {
        rawLabel,
        normalizedLabel,
        kind: local.kind,
        destination: local.destination,
        method: 'category',
        confidence: local.confidence,
        reason: local.reason,
      }
    }

    return {
      rawLabel,
      normalizedLabel,
      kind: 'outro' as unknown as TKind,
      destination: 'medical_record' as unknown as TDest,
      method: 'fallback',
      confidence: 0.20,
      reason: 'Sem correspondência vetorial ou LLM aceitável',
    }
  }

  /**
   * Combina o catálogo estático semente com entradas dinâmicas aprendidas salvas no banco.
   */
  private async buildCombinedCatalog(): Promise<Array<SemanticCatalogEntry<TKind, TDest>>> {
    if (!this.cacheRepo) return this.staticCatalog

    const cachedEntries = await this.cacheRepo.findAllByDomain<TKind, TDest>(this.domain).catch(() => [])
    if (!cachedEntries.length) return this.staticCatalog

    const combined: Array<SemanticCatalogEntry<TKind, TDest>> = [...this.staticCatalog]

    for (const c of cachedEntries) {
      combined.push({
        id: c.catalogId ?? `dynamic:${c.id}`,
        canonicalName: c.canonicalName ?? c.rawLabel,
        kind: c.kind,
        destination: c.destination,
        aliases: [c.rawLabel, c.normalizedLabel],
        domain: this.domain,
      })
    }

    return combined
  }
}
