import type { ImportBatchData, ImportBatchProps } from './import-source.js'
import type { ImportRecordType, ImportSource } from './import-source.js'
import type { NormalizationMeta } from './normalization-meta.js'
import type { ProcessedLink } from './external-record.js'

export interface RecordRawInput {
  batchId: string
  patientId: string
  source: ImportSource
  recordType: ImportRecordType
  externalKey?: string | null
  rawJson: Record<string, unknown>
  normalization?: NormalizationMeta
  processed?: ProcessedLink
}

export interface ImportLineageRepository {
  createBatch(props: ImportBatchProps): Promise<ImportBatchData>
  completeBatch(batchId: string, stats?: Record<string, unknown>): Promise<void>
  recordRaw(input: RecordRawInput): Promise<string>
  linkProcessed(rawId: string, processed: ProcessedLink): Promise<void>
}
