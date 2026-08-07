import type { ImportRecordType, ImportSource } from './import-source.js'
import type { NormalizationMeta } from './normalization-meta.js'

/** Payload recebido de um adapter externo, antes da persistência interna. */
export interface ExternalInboundRecord<TPayload = Record<string, unknown>> {
  source: ImportSource
  recordType: ImportRecordType
  externalKey?: string | null
  /** JSON exatamente como veio da origem (ou recorte fiel do documento/API). */
  rawPayload: TPayload
  normalization?: NormalizationMeta
}

export interface ProcessedLink {
  table: string
  id: string
}
