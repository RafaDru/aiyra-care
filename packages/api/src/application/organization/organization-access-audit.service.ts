import type { Pool } from 'pg'

export type OrganizationAuditAction =
  | 'org.view'
  | 'org.members.list'
  | 'org.update'
  | 'org.delete'
  | 'org.member.add'
  | 'org.member.update'
  | 'org.member.remove'
  | 'org.audit.list'

export class OrganizationAccessAuditService {
  constructor(private readonly pool: Pool) {}

  async record(input: {
    organizationId: string
    actorAccountId: string
    action: OrganizationAuditAction
    targetAccountId?: string | null
    metadata?: Record<string, unknown>
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO organization_access_audit
         (organization_id, actor_account_id, action, target_account_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        input.organizationId,
        input.actorAccountId,
        input.action,
        input.targetAccountId ?? null,
        JSON.stringify(input.metadata ?? {}),
      ],
    )
  }

  async listForOrganization(organizationId: string, limit = 50) {
    const { rows } = await this.pool.query<{
      id: string
      organization_id: string
      actor_account_id: string
      action: string
      target_account_id: string | null
      metadata: Record<string, unknown>
      created_at: Date
    }>(
      `SELECT id, organization_id, actor_account_id, action, target_account_id, metadata, created_at
       FROM organization_access_audit
       WHERE organization_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [organizationId, limit],
    )
    return rows.map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      actorAccountId: row.actor_account_id,
      action: row.action,
      targetAccountId: row.target_account_id,
      metadata: row.metadata ?? {},
      createdAt: row.created_at.toISOString(),
    }))
  }
}
