/**
 * One-shot: align incident_pipeline_status with outbox when UI was stuck on in_triage.
 * Uso: cd packages/api && node scripts/reconcile-incident-pipeline-display.mjs
 */
import pg from 'pg'

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

const res = await pool.query(`
  UPDATE ops_analysis_queue q
  SET incident_pipeline_status = 'forwarded', updated_at = NOW()
  FROM incident_dispatch_outbox o
  WHERE o.incident_id = q.id
    AND o.status = 'forwarded'
    AND q.incident_pipeline_status = 'in_triage'
    AND q.analysis_artifact_path IS NULL
    AND q.status NOT IN ('completed', 'dismissed')
  RETURNING q.id, q.reference_code, q.incident_pipeline_status`)

console.log('reconcile-incident-pipeline-display:', {
  updated: res.rowCount,
  rows: res.rows,
})

await pool.end()
