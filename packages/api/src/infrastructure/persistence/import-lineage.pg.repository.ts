import type { Pool } from 'pg'
import type {
  ImportLineageRepository,
  RecordRawInput,
} from '../../domain/import-lineage/import-lineage.repository.js'
import type { ImportBatchData, ImportBatchProps } from '../../domain/import-lineage/import-source.js'
import type { ProcessedLink } from '../../domain/import-lineage/external-record.js'
import type { NormalizationMeta } from '../../domain/import-lineage/normalization-meta.js'

function mapNormalizationColumns(norm?: NormalizationMeta): {
  catalogSlotKey: string | null
  matchMethod: string | null
  matchScore: number | null
  normalizationJson: Record<string, unknown> | null
} {
  if (!norm) {
    return { catalogSlotKey: null, matchMethod: null, matchScore: null, normalizationJson: null }
  }
  const { catalogSlotKey, method, score, catalogId, displayName, details, ...rest } = norm
  const extra = { ...rest, catalogId, displayName, details }
  const hasExtra = Object.values(extra).some((v) => v != null)
  return {
    catalogSlotKey: catalogSlotKey ?? null,
    matchMethod: method ?? null,
    matchScore: score ?? null,
    normalizationJson: hasExtra ? extra : null,
  }
}

export class ImportLineagePgRepository implements ImportLineageRepository {
  constructor(private readonly pool: Pool) {}

  async createBatch(props: ImportBatchProps): Promise<ImportBatchData> {
    const { rows } = await this.pool.query(
      `INSERT INTO import_batches (patient_id, source, portal, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, patient_id, source, portal, status, stats, created_at`,
      [
        props.patientId,
        props.source,
        props.portal ?? null,
        props.status ?? 'running',
      ],
    )
    const row = rows[0]
    return {
      id: row.id as string,
      patientId: row.patient_id as string,
      source: row.source as ImportBatchData['source'],
      portal: row.portal as ImportBatchData['portal'],
      status: row.status as ImportBatchData['status'],
      stats: row.stats as Record<string, unknown> | null,
      createdAt: row.created_at as Date,
    }
  }

  async completeBatch(batchId: string, stats?: Record<string, unknown>): Promise<void> {
    await this.pool.query(
      `UPDATE import_batches SET status = 'completed', stats = COALESCE($2::jsonb, stats) WHERE id = $1`,
      [batchId, stats ? JSON.stringify(stats) : null],
    )
  }

  async recordRaw(input: RecordRawInput): Promise<string> {
    const cols = mapNormalizationColumns(input.normalization)
    const { rows } = await this.pool.query(
      `INSERT INTO import_raw_records (
        batch_id, patient_id, source, record_type, external_key, raw_json,
        catalog_slot_key, match_method, match_score, normalization,
        processed_table, processed_id
      ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10::jsonb,$11,$12)
      RETURNING id`,
      [
        input.batchId,
        input.patientId,
        input.source,
        input.recordType,
        input.externalKey ?? null,
        JSON.stringify(input.rawJson),
        cols.catalogSlotKey,
        cols.matchMethod,
        cols.matchScore,
        cols.normalizationJson ? JSON.stringify(cols.normalizationJson) : null,
        input.processed?.table ?? null,
        input.processed?.id ?? null,
      ],
    )
    return rows[0].id as string
  }

  async linkProcessed(rawId: string, processed: ProcessedLink): Promise<void> {
    await this.pool.query(
      `UPDATE import_raw_records SET processed_table = $2, processed_id = $3 WHERE id = $1`,
      [rawId, processed.table, processed.id],
    )
  }
}
