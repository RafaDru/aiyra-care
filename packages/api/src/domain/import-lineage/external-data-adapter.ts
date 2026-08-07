import type { ExternalInboundRecord } from './external-record.js'
import type { ImportPortal, ImportRecordType, ImportSource } from './import-source.js'
import type { NormalizationMeta } from './normalization-meta.js'

export interface AdapterContext {
  patientId: string
  birthDate?: string | null
  batchId: string
}

/**
 * Porta hexagonal: cada integração externa implementa um adapter que
 * 1) preserva o raw, 2) opcionalmente normaliza, 3) produz o modelo interno.
 */
export interface ExternalDataAdapter<TExternal, TInternal = unknown> {
  readonly source: ImportSource
  readonly portal?: ImportPortal
  readonly recordType: ImportRecordType

  externalKey(external: TExternal): string | undefined
  rawPayload(external: TExternal): Record<string, unknown>

  /** Conferência / mapeamento ao catálogo interno (vacinas, TUSS, etc.). */
  normalize?(external: TExternal, ctx: AdapterContext): NormalizationMeta | undefined

  toInternal(external: TExternal, ctx: AdapterContext, normalization?: NormalizationMeta): TInternal
}

export function toInboundRecord<TExternal>(
  adapter: ExternalDataAdapter<TExternal>,
  external: TExternal,
  ctx: AdapterContext,
): ExternalInboundRecord {
  const normalization = adapter.normalize?.(external, ctx)
  return {
    source: adapter.source,
    recordType: adapter.recordType,
    externalKey: adapter.externalKey(external) ?? null,
    rawPayload: adapter.rawPayload(external),
    normalization,
  }
}
