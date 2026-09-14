import { describe, expect, it, vi } from 'vitest'
import type { Pool } from 'pg'
import { OpsAlertIncidentPgRepository } from '../src/infrastructure/persistence/ops-alert-incident.pg.repository.js'

describe('OpsAlertIncidentPgRepository', () => {
  it('upserts and reads incident analysis state', async () => {
    const rows = new Map<string, Record<string, unknown>>()
    const pool = {
      query: vi.fn(async (sql: string, params?: unknown[]) => {
        if (sql.includes('INSERT INTO ops_alert_incidents')) {
          const alertId = params![0] as string
          rows.set(alertId, {
            alert_id: alertId,
            analysis_status: params![1],
            operator_notes: params![2],
            analysis_summary: params![3],
            analysis_artifact_path: params![4],
            analysis_requested_at: params![5],
            analysis_completed_at: params![6],
            analysis_last_error: params![7],
            last_severity: params![8],
            last_category: params![9],
            last_message: params![10],
          })
          return { rows: [] }
        }
        if (sql.includes('investigator_last_sent_at FROM')) {
          return { rows: [] }
        }
        if (sql.includes('WHERE alert_id = $1')) {
          const alertId = params![0] as string
          const row = rows.get(alertId)
          return { rows: row ? [row] : [] }
        }
        if (sql.includes('ORDER BY updated_at DESC')) {
          return { rows: [...rows.values()] }
        }
        return { rows: [] }
      }),
    } as unknown as Pool

    const repo = new OpsAlertIncidentPgRepository(pool)
    await repo.save({
      alertId: 'infra_api_down',
      analysisStatus: 'in_progress',
      operatorNotes: 'checar porta',
      analysisSummary: null,
      analysisArtifactPath: null,
      analysisRequestedAt: '2026-09-08T12:00:00.000Z',
      analysisCompletedAt: null,
      analysisLastError: null,
      lastSeverity: 'critical',
      lastCategory: 'infra',
      lastMessage: 'API down',
    })

    const row = await repo.get('infra_api_down')
    expect(row.analysisStatus).toBe('in_progress')
    expect(row.operatorNotes).toBe('checar porta')

    const all = await repo.listAll()
    expect(all).toHaveLength(1)
  })
})
