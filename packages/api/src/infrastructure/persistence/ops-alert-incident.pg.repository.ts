import type { Pool } from 'pg'
import type { OpsAlertAnalysisStore } from '../../application/ops/ops-alert-analysis.store.js'
import type { OpsAlertAnalysisRecord, OpsAlertAnalysisStatus } from '../../domain/ops/ops-alert-analysis.types.js'
import { emptyOpsAlertAnalysis } from '../../domain/ops/ops-alert-analysis.types.js'
import { isPgMissingTableError } from './pg-error.helper.js'

function mapRow(row: Record<string, unknown>): OpsAlertAnalysisRecord {
  return {
    alertId: row.alert_id as string,
    analysisStatus: row.analysis_status as OpsAlertAnalysisStatus,
    operatorNotes: row.operator_notes as string | null,
    analysisSummary: row.analysis_summary as string | null,
    analysisArtifactPath: row.analysis_artifact_path as string | null,
    analysisRequestedAt: row.analysis_requested_at
      ? new Date(row.analysis_requested_at as string).toISOString()
      : null,
    analysisCompletedAt: row.analysis_completed_at
      ? new Date(row.analysis_completed_at as string).toISOString()
      : null,
    analysisLastError: row.analysis_last_error as string | null,
    lastSeverity: row.last_severity as string | null,
    lastCategory: row.last_category as string | null,
    lastMessage: row.last_message as string | null,
  }
}

export class OpsAlertIncidentPgRepository implements OpsAlertAnalysisStore {
  constructor(private readonly pool: Pool) {}

  async get(alertId: string): Promise<OpsAlertAnalysisRecord> {
    try {
      const { rows } = await this.pool.query(
        `SELECT alert_id, analysis_status, operator_notes, analysis_summary,
                analysis_artifact_path, analysis_requested_at, analysis_completed_at,
                analysis_last_error, last_severity, last_category, last_message
         FROM ops_alert_incidents
         WHERE alert_id = $1`,
        [alertId],
      )
      if (!rows.length) return emptyOpsAlertAnalysis(alertId)
      return mapRow(rows[0] as Record<string, unknown>)
    } catch (err) {
      if (isPgMissingTableError(err)) return emptyOpsAlertAnalysis(alertId)
      throw err
    }
  }

  async listAll(): Promise<OpsAlertAnalysisRecord[]> {
    try {
      const { rows } = await this.pool.query(
        `SELECT alert_id, analysis_status, operator_notes, analysis_summary,
                analysis_artifact_path, analysis_requested_at, analysis_completed_at,
                analysis_last_error, last_severity, last_category, last_message
         FROM ops_alert_incidents
         ORDER BY updated_at DESC`,
      )
      return rows.map((row) => mapRow(row as Record<string, unknown>))
    } catch (err) {
      if (isPgMissingTableError(err)) return []
      throw err
    }
  }

  async save(record: OpsAlertAnalysisRecord): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO ops_alert_incidents (
           alert_id, analysis_status, operator_notes, analysis_summary,
           analysis_artifact_path, analysis_requested_at, analysis_completed_at,
           analysis_last_error, last_severity, last_category, last_message, updated_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()
         )
         ON CONFLICT (alert_id) DO UPDATE SET
           analysis_status = EXCLUDED.analysis_status,
           operator_notes = EXCLUDED.operator_notes,
           analysis_summary = EXCLUDED.analysis_summary,
           analysis_artifact_path = EXCLUDED.analysis_artifact_path,
           analysis_requested_at = COALESCE(EXCLUDED.analysis_requested_at, ops_alert_incidents.analysis_requested_at),
           analysis_completed_at = EXCLUDED.analysis_completed_at,
           analysis_last_error = EXCLUDED.analysis_last_error,
           last_severity = EXCLUDED.last_severity,
           last_category = EXCLUDED.last_category,
           last_message = EXCLUDED.last_message,
           updated_at = NOW()`,
        [
          record.alertId,
          record.analysisStatus,
          record.operatorNotes,
          record.analysisSummary,
          record.analysisArtifactPath,
          record.analysisRequestedAt,
          record.analysisCompletedAt,
          record.analysisLastError,
          record.lastSeverity,
          record.lastCategory,
          record.lastMessage,
        ],
      )
    } catch (err) {
      if (isPgMissingTableError(err)) return
      throw err
    }
  }

  async investigatorCooldownElapsed(
    alertId: string,
    cooldownMs: number,
    now = Date.now(),
  ): Promise<boolean> {
    try {
      const { rows } = await this.pool.query(
        `SELECT investigator_last_sent_at FROM ops_alert_incidents WHERE alert_id = $1`,
        [alertId],
      )
      const raw = rows[0]?.investigator_last_sent_at
      if (!raw) return true
      const last = new Date(raw as string).getTime()
      return now - last >= cooldownMs
    } catch (err) {
      if (isPgMissingTableError(err)) return true
      throw err
    }
  }

  async markInvestigatorSent(alertId: string, now = Date.now()): Promise<void> {
    const sentAt = new Date(now).toISOString()
    try {
      await this.pool.query(
        `INSERT INTO ops_alert_incidents (alert_id, analysis_status, investigator_last_sent_at, updated_at)
         VALUES ($1, 'none', $2::timestamptz, NOW())
         ON CONFLICT (alert_id) DO UPDATE SET
           investigator_last_sent_at = EXCLUDED.investigator_last_sent_at,
           updated_at = NOW()`,
        [alertId, sentAt],
      )
    } catch (err) {
      if (isPgMissingTableError(err)) return
      throw err
    }
  }
}
