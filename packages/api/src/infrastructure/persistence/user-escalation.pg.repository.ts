import type { Pool } from 'pg'
import type {
  AccountNotificationPreferences,
  SyncEscalationIncident,
} from '../../domain/user-escalation/user-escalation.types.js'

function mapPrefs(row: Record<string, unknown>): AccountNotificationPreferences {
  return {
    accountId: row.account_id as string,
    syncEscalationEmail: Boolean(row.sync_escalation_email),
    syncEscalationOptedInAt: row.sync_escalation_opted_in_at
      ? new Date(row.sync_escalation_opted_in_at as string)
      : null,
    updatedAt: new Date(row.updated_at as string),
  }
}

function mapIncident(row: Record<string, unknown>): SyncEscalationIncident {
  return {
    id: row.id as string,
    accountId: row.account_id as string,
    integrationLinkId: row.integration_link_id as string,
    portalType: row.portal_type as string,
    status: row.status as SyncEscalationIncident['status'],
    failureCount: Number(row.failure_count),
    lastNotifiedAt: row.last_notified_at
      ? new Date(row.last_notified_at as string)
      : null,
    openedAt: new Date(row.opened_at as string),
    resolvedAt: row.resolved_at ? new Date(row.resolved_at as string) : null,
    updatedAt: new Date(row.updated_at as string),
  }
}

export class UserEscalationPgRepository {
  constructor(private readonly pool: Pool) {}

  async resolveAccountIdsForPatient(patientId: string): Promise<string[]> {
    const { rows } = await this.pool.query(
      `SELECT DISTINCT account_id FROM (
         SELECT owner_account_id AS account_id FROM patients
         WHERE id = $1 AND owner_account_id IS NOT NULL
         UNION
         SELECT account_id FROM patient_memberships WHERE patient_id = $1
       ) t`,
      [patientId],
    )
    return rows.map((r) => r.account_id as string)
  }

  async getPreferences(accountId: string): Promise<AccountNotificationPreferences> {
    const { rows } = await this.pool.query(
      `SELECT account_id, sync_escalation_email, sync_escalation_opted_in_at, updated_at
       FROM account_notification_preferences WHERE account_id = $1`,
      [accountId],
    )
    if (rows[0]) return mapPrefs(rows[0])
    return {
      accountId,
      syncEscalationEmail: false,
      syncEscalationOptedInAt: null,
      updatedAt: new Date(),
    }
  }

  async upsertPreferences(
    accountId: string,
    syncEscalationEmail: boolean,
  ): Promise<AccountNotificationPreferences> {
    const { rows } = await this.pool.query(
      `INSERT INTO account_notification_preferences (
         account_id, sync_escalation_email, sync_escalation_opted_in_at, updated_at
       ) VALUES ($1, $2, CASE WHEN $2 THEN NOW() ELSE NULL END, NOW())
       ON CONFLICT (account_id) DO UPDATE SET
         sync_escalation_email = EXCLUDED.sync_escalation_email,
         sync_escalation_opted_in_at = CASE
           WHEN EXCLUDED.sync_escalation_email AND account_notification_preferences.sync_escalation_opted_in_at IS NULL
           THEN NOW()
           WHEN NOT EXCLUDED.sync_escalation_email THEN NULL
           ELSE account_notification_preferences.sync_escalation_opted_in_at
         END,
         updated_at = NOW()
       RETURNING account_id, sync_escalation_email, sync_escalation_opted_in_at, updated_at`,
      [accountId, syncEscalationEmail],
    )
    return mapPrefs(rows[0])
  }

  async countFailedJobs24h(integrationLinkId: string): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT COUNT(*)::int AS n FROM sync_jobs
       WHERE integration_link_id = $1
         AND status = 'failed'
         AND finished_at >= NOW() - INTERVAL '24 hours'`,
      [integrationLinkId],
    )
    return Number(rows[0]?.n ?? 0)
  }

  async findOpenIncident(integrationLinkId: string): Promise<SyncEscalationIncident | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM sync_escalation_incidents
       WHERE integration_link_id = $1 AND status = 'open'
       LIMIT 1`,
      [integrationLinkId],
    )
    return rows[0] ? mapIncident(rows[0]) : null
  }

  async listOpenIncidents(accountId: string): Promise<SyncEscalationIncident[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM sync_escalation_incidents
       WHERE account_id = $1 AND status = 'open'
       ORDER BY opened_at DESC`,
      [accountId],
    )
    return rows.map(mapIncident)
  }

  async upsertOpenIncident(args: {
    accountId: string
    integrationLinkId: string
    portalType: string
    failureCount: number
  }): Promise<SyncEscalationIncident> {
    const existing = await this.findOpenIncident(args.integrationLinkId)
    if (existing) {
      const { rows } = await this.pool.query(
        `UPDATE sync_escalation_incidents SET
           failure_count = $2, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [existing.id, args.failureCount],
      )
      return mapIncident(rows[0])
    }
    const { rows } = await this.pool.query(
      `INSERT INTO sync_escalation_incidents (
         account_id, integration_link_id, portal_type, status, failure_count
       ) VALUES ($1, $2, $3, 'open', $4)
       RETURNING *`,
      [args.accountId, args.integrationLinkId, args.portalType, args.failureCount],
    )
    return mapIncident(rows[0])
  }

  async markNotified(incidentId: string): Promise<void> {
    await this.pool.query(
      `UPDATE sync_escalation_incidents SET
         last_notified_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [incidentId],
    )
  }

  async resolveOpenIncident(integrationLinkId: string): Promise<SyncEscalationIncident | null> {
    const { rows } = await this.pool.query(
      `UPDATE sync_escalation_incidents SET
         status = 'resolved', resolved_at = NOW(), updated_at = NOW()
       WHERE integration_link_id = $1 AND status = 'open'
       RETURNING *`,
      [integrationLinkId],
    )
    return rows[0] ? mapIncident(rows[0]) : null
  }
}
