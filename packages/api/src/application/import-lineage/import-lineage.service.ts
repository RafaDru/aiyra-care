import type {
  ImportLineageRepository,
  RecordRawInput,
} from '../../domain/import-lineage/import-lineage.repository.js'
import type { ExternalInboundRecord } from '../../domain/import-lineage/external-record.js'
import type { ImportBatchProps } from '../../domain/import-lineage/import-source.js'
import type { ProcessedLink } from '../../domain/import-lineage/external-record.js'

export class ImportLineageService {
  constructor(private readonly lineage: ImportLineageRepository) {}

  async startBatch(props: ImportBatchProps): Promise<string> {
    const batch = await this.lineage.createBatch(props)
    return batch.id
  }

  async completeBatch(batchId: string, stats?: Record<string, unknown>): Promise<void> {
    await this.lineage.completeBatch(batchId, stats)
  }

  async recordInbound(
    batchId: string,
    patientId: string,
    inbound: ExternalInboundRecord,
    processed?: ProcessedLink,
  ): Promise<string> {
    return this.lineage.recordRaw({
      batchId,
      patientId,
      source: inbound.source,
      recordType: inbound.recordType,
      externalKey: inbound.externalKey,
      rawJson: inbound.rawPayload as Record<string, unknown>,
      normalization: inbound.normalization,
      processed,
    })
  }

  async recordRaw(input: RecordRawInput): Promise<string> {
    return this.lineage.recordRaw(input)
  }

  async linkProcessed(rawId: string, processed: ProcessedLink): Promise<void> {
    await this.lineage.linkProcessed(rawId, processed)
  }
}
