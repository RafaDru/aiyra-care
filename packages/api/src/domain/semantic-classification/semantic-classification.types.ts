/**
 * Tipos e portas canônicas para o motor genérico de classificação semântica.
 * Reutilizável em múltiplos contextos: rótulos de operadora, OCR de documentos,
 * analitos de laboratório, receitas/medicações, etc.
 */

export type SemanticDomain = 'health_label' | 'ocr_document' | 'lab_analyte' | 'medication' | string

export type SemanticClassificationMethod =
  | 'exact'
  | 'cache'
  | 'vector'
  | 'llm'
  | 'category'
  | 'fallback'

export interface SemanticClassificationResult<TKind = string, TDest = string> {
  rawLabel: string
  normalizedLabel: string
  kind: TKind
  destination: TDest
  canonicalName?: string
  catalogId?: string
  method: SemanticClassificationMethod
  /** Confiança quantitativa em [0.0, 1.0]. */
  confidence: number
  reason: string
  /** Similaridade de cosseno vetorial calculada (se método vetorial). */
  vectorSimilarity?: number
}

export interface SemanticCatalogEntry<TKind = string, TDest = string> {
  id: string
  canonicalName: string
  kind: TKind
  destination: TDest
  aliases: string[]
  domain?: SemanticDomain
}

export interface SemanticCacheEntry<TKind = string, TDest = string> {
  id: string
  domain: string
  rawLabel: string
  normalizedLabel: string
  kind: TKind
  destination: TDest
  canonicalName?: string
  catalogId?: string
  confidence: number
  sourceMethod: 'llm' | 'manual' | 'vector'
  timesHit: number
  createdAt: Date
  updatedAt: Date
}

export interface SemanticCacheRepositoryPort {
  findByNormalizedLabel(
    domain: string,
    normalizedLabel: string,
  ): Promise<SemanticCacheEntry | null>

  saveOrIncrement(
    entry: Omit<SemanticCacheEntry, 'id' | 'timesHit' | 'createdAt' | 'updatedAt'>,
  ): Promise<SemanticCacheEntry>

  findAllByDomain(domain: string): Promise<SemanticCacheEntry[]>
}
