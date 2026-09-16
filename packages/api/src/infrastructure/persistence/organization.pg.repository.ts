import type { Pool } from 'pg'
import { Organization } from '../../domain/organization/organization.entity.js'
import type {
  OrganizationMemberData,
  OrganizationRepository,
} from '../../domain/organization/organization.repository.js'
import type { OrganizationData, OrganizationKind, OrganizationMemberRole } from '../../domain/organization/organization.entity.js'

function mapOrg(row: Record<string, unknown>): OrganizationData {
  return {
    id: String(row.id),
    name: String(row.name),
    kind: row.kind as OrganizationKind,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

function mapMember(row: Record<string, unknown>): OrganizationMemberData {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    accountId: String(row.account_id),
    role: row.role as OrganizationMemberRole,
    createdAt: new Date(row.created_at as string),
  }
}

export class OrganizationPgRepository implements OrganizationRepository {
  constructor(private readonly pool: Pool) {}

  async create(name: string, kind: OrganizationKind): Promise<OrganizationData> {
    const org = Organization.create({ name, kind })
    const data = org.toJSON()
    const { rows } = await this.pool.query(
      `INSERT INTO organizations (id, name, kind) VALUES ($1, $2, $3) RETURNING *`,
      [data.id, data.name, data.kind],
    )
    return mapOrg(rows[0] as Record<string, unknown>)
  }

  async findById(id: string): Promise<OrganizationData | null> {
    const { rows } = await this.pool.query(`SELECT * FROM organizations WHERE id = $1`, [id])
    return rows[0] ? mapOrg(rows[0] as Record<string, unknown>) : null
  }

  async update(id: string, patch: { name?: string; kind?: OrganizationKind }): Promise<OrganizationData | null> {
    const existing = await this.findById(id)
    if (!existing) return null
    const name = patch.name?.trim() ?? existing.name
    const kind = patch.kind ?? existing.kind
    const { rows } = await this.pool.query(
      `UPDATE organizations SET name = $2, kind = $3, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, name, kind],
    )
    return rows[0] ? mapOrg(rows[0] as Record<string, unknown>) : null
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(`DELETE FROM organizations WHERE id = $1`, [id])
    return (rowCount ?? 0) > 0
  }

  async listForAccount(accountId: string): Promise<OrganizationData[]> {
    const { rows } = await this.pool.query(
      `SELECT o.* FROM organizations o
       INNER JOIN organization_members m ON m.organization_id = o.id
       WHERE m.account_id = $1
       ORDER BY o.name`,
      [accountId],
    )
    return rows.map((r) => mapOrg(r as Record<string, unknown>))
  }

  async addMember(
    organizationId: string,
    accountId: string,
    role: OrganizationMemberRole,
  ): Promise<OrganizationMemberData> {
    const { rows } = await this.pool.query(
      `INSERT INTO organization_members (organization_id, account_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (organization_id, account_id) DO UPDATE SET role = EXCLUDED.role
       RETURNING *`,
      [organizationId, accountId, role],
    )
    return mapMember(rows[0] as Record<string, unknown>)
  }

  async listMembers(organizationId: string): Promise<OrganizationMemberData[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM organization_members WHERE organization_id = $1 ORDER BY created_at`,
      [organizationId],
    )
    return rows.map((r) => mapMember(r as Record<string, unknown>))
  }

  async findMember(organizationId: string, accountId: string): Promise<OrganizationMemberData | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM organization_members WHERE organization_id = $1 AND account_id = $2`,
      [organizationId, accountId],
    )
    return rows[0] ? mapMember(rows[0] as Record<string, unknown>) : null
  }

  async updateMemberRole(memberId: string, role: OrganizationMemberRole): Promise<OrganizationMemberData | null> {
    const { rows } = await this.pool.query(
      `UPDATE organization_members SET role = $2 WHERE id = $1 RETURNING *`,
      [memberId, role],
    )
    return rows[0] ? mapMember(rows[0] as Record<string, unknown>) : null
  }

  async removeMember(memberId: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(`DELETE FROM organization_members WHERE id = $1`, [memberId])
    return (rowCount ?? 0) > 0
  }
}
