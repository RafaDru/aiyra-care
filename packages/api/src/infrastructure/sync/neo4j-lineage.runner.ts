import type { Pool } from 'pg'
import { neo4jDriver } from '../../db/neo4j.js'
import { ImportLineageGraphProjector } from '../graph/import-lineage-graph.projector.js'
import { isNeo4jSyncEnabled } from '../graph/neo4j-env.js'

export interface Neo4jLineageBatchReport {
  processed: number
  skipped: number
  cursor: string | null
}

const CURSOR_KEY = 'import_lineage'

export async function runNeo4jLineageBatch(
  pool: Pool,
  opts?: { patientId?: string; backfill?: boolean; batchSize?: number },
): Promise<Neo4jLineageBatchReport> {
  if (!isNeo4jSyncEnabled()) {
    return { processed: 0, skipped: 0, cursor: null }
  }

  const batchSize = opts?.batchSize ?? Number(process.env.NEO4J_LINEAGE_BATCH_SIZE ?? '100')
  const projector = new ImportLineageGraphProjector(neo4jDriver, pool)

  let lastCreatedAt: Date
  if (opts?.backfill) {
    lastCreatedAt = new Date('1970-01-01')
  } else {
    const cursorRow = await pool.query(
      `SELECT last_raw_created_at FROM neo4j_projection_state WHERE key = $1`,
      [CURSOR_KEY],
    )
    lastCreatedAt = cursorRow.rows[0]?.last_raw_created_at
      ? new Date(cursorRow.rows[0].last_raw_created_at as string)
      : new Date('1970-01-01')
  }

  const params: unknown[] = [lastCreatedAt, batchSize]
  let patientFilter = ''
  if (opts?.patientId) {
    patientFilter = 'AND patient_id = $3'
    params.push(opts.patientId)
  }

  const { rows } = await pool.query(
    `SELECT id, patient_id, batch_id, source, processed_table, processed_id, created_at
     FROM import_raw_records
     WHERE processed_id IS NOT NULL
       AND processed_table IS NOT NULL
       AND created_at > $1
       ${patientFilter}
     ORDER BY created_at ASC
     LIMIT $2`,
    params,
  )

  let processed = 0
  let skipped = 0
  let maxCreatedAt = lastCreatedAt

  for (const row of rows) {
    const createdAt = new Date(row.created_at as string)
    if (createdAt > maxCreatedAt) maxCreatedAt = createdAt

    const table = row.processed_table as string
    if (!['exams', 'medical_records', 'authorizations'].includes(table)) {
      skipped++
      continue
    }

    try {
      await projector.projectProcessedRecord({
        patientId: row.patient_id as string,
        processedTable: table,
        processedId: row.processed_id as string,
        batchId: row.batch_id as string,
        rawRecordId: row.id as string,
        source: row.source as string,
      })
      processed++
    } catch {
      skipped++
    }
  }

  if (rows.length > 0 && !opts?.patientId) {
    await pool.query(
      `INSERT INTO neo4j_projection_state (key, last_raw_created_at, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET last_raw_created_at = $2, updated_at = NOW()`,
      [CURSOR_KEY, maxCreatedAt.toISOString()],
    )
  }

  return {
    processed,
    skipped,
    cursor: maxCreatedAt.toISOString(),
  }
}
