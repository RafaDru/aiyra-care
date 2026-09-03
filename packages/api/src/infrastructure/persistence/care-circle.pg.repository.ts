import type { Pool } from 'pg'
import type { CareCircleRepository } from '../../domain/care-circle/care-circle.repository.js'
import type {
  CareCircleData,
  CareCircleDetail,
  CareCircleMemberData,
  CareCircleMemberRole,
  CareCirclePatientLink,
} from '../../domain/care-circle/care-circle.types.js'

function mapCircle(row: Record<string, unknown>): CareCircleData {
  return {
    id: String(row.id),
    name: String(row.name),
    billingOwnerAccountId: String(row.billing_owner_account_id),
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

function mapMember(row: Record<string, unknown>): CareCircleMemberData {
  return {
    id: String(row.id),
    circleId: String(row.circle_id),
    accountId: String(row.account_id),
    role: row.role as CareCircleMemberRole,
    createdAt: new Date(row.created_at as string),
    email: row.email ? String(row.email) : null,
    displayName: row.display_name ? String(row.display_name) : null,
  }
}

export class CareCirclePgRepository implements CareCircleRepository {
  constructor(private readonly pool: Pool) {}

  async create(name: string, billingOwnerAccountId: string) {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const { rows } = await client.query(
        `INSERT INTO care_circles (name, billing_owner_account_id) VALUES ($1, $2) RETURNING *`,
        [name.trim(), billingOwnerAccountId],
      )
      const circle = mapCircle(rows[0] as Record<string, unknown>)
      await client.query(
        `INSERT INTO care_circle_members (circle_id, account_id, role) VALUES ($1, $2, 'owner')`,
        [circle.id, billingOwnerAccountId],
      )
      await client.query('COMMIT')
      return circle
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  }

  async findById(id: string) {
    const { rows } = await this.pool.query(`SELECT * FROM care_circles WHERE id = $1`, [id])
    return rows[0] ? mapCircle(rows[0] as Record<string, unknown>) : null
  }

  async updateName(id: string, name: string) {
    const { rows } = await this.pool.query(
      `UPDATE care_circles SET name = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, name.trim()],
    )
    return rows[0] ? mapCircle(rows[0] as Record<string, unknown>) : null
  }

  async listForAccount(accountId: string) {
    const { rows } = await this.pool.query(
      `SELECT c.*, m.role AS member_role FROM care_circles c
       INNER JOIN care_circle_members m ON m.circle_id = c.id
       WHERE m.account_id = $1
       ORDER BY c.name`,
      [accountId],
    )
    return rows.map((r) => ({
      ...mapCircle(r as Record<string, unknown>),
      memberRole: (r as Record<string, unknown>).member_role as CareCircleMemberRole,
    }))
  }

  async listDashboardGroups(accountId: string) {
    const { rows } = await this.pool.query(
      `SELECT c.id::text AS id, c.name, m.role AS member_role,
              COALESCE(array_agg(l.patient_id::text) FILTER (WHERE l.patient_id IS NOT NULL), '{}') AS patient_ids
       FROM care_circles c
       INNER JOIN care_circle_members m ON m.circle_id = c.id AND m.account_id = $1
       LEFT JOIN patient_circle_links l ON l.circle_id = c.id
       GROUP BY c.id, c.name, m.role
       ORDER BY c.name`,
      [accountId],
    )
    return rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      memberRole: r.member_role as CareCircleMemberRole,
      patientIds: (r.patient_ids as string[]) ?? [],
    }))
  }

  async findMember(circleId: string, accountId: string) {
    const { rows } = await this.pool.query(
      `SELECT m.*, a.email, a.display_name
       FROM care_circle_members m
       JOIN app_accounts a ON a.id = m.account_id
       WHERE m.circle_id = $1 AND m.account_id = $2`,
      [circleId, accountId],
    )
    return rows[0] ? mapMember(rows[0] as Record<string, unknown>) : null
  }

  async listMembers(circleId: string) {
    const { rows } = await this.pool.query(
      `SELECT m.*, a.email, a.display_name
       FROM care_circle_members m
       JOIN app_accounts a ON a.id = m.account_id
       WHERE m.circle_id = $1
       ORDER BY m.created_at`,
      [circleId],
    )
    return rows.map((r) => mapMember(r as Record<string, unknown>))
  }

  async addMember(circleId: string, accountId: string, role: CareCircleMemberRole) {
    const { rows } = await this.pool.query(
      `INSERT INTO care_circle_members (circle_id, account_id, role) VALUES ($1, $2, $3)
       ON CONFLICT (circle_id, account_id) DO UPDATE SET role = EXCLUDED.role
       RETURNING *`,
      [circleId, accountId, role],
    )
    const member = mapMember(rows[0] as Record<string, unknown>)
    const acc = await this.pool.query(`SELECT email, display_name FROM app_accounts WHERE id = $1`, [accountId])
    if (acc.rows[0]) {
      member.email = acc.rows[0].email as string | null
      member.displayName = acc.rows[0].display_name as string | null
    }
    return member
  }

  async updateMemberRole(memberId: string, role: CareCircleMemberRole) {
    const { rows } = await this.pool.query(
      `UPDATE care_circle_members SET role = $2 WHERE id = $1 RETURNING *`,
      [memberId, role],
    )
    return rows[0] ? mapMember(rows[0] as Record<string, unknown>) : null
  }

  async removeMember(memberId: string) {
    const { rowCount } = await this.pool.query(`DELETE FROM care_circle_members WHERE id = $1`, [memberId])
    return (rowCount ?? 0) > 0
  }

  async countAdmins(circleId: string) {
    const { rows } = await this.pool.query(
      `SELECT COUNT(*)::int AS c FROM care_circle_members WHERE circle_id = $1 AND role = 'admin'`,
      [circleId],
    )
    return rows[0]?.c ?? 0
  }

  async listPatients(circleId: string) {
    const { rows } = await this.pool.query(
      `SELECT p.id AS patient_id, p.name AS patient_name, l.circle_id
       FROM patient_circle_links l
       JOIN patients p ON p.id = l.patient_id
       WHERE l.circle_id = $1
       ORDER BY p.name`,
      [circleId],
    )
    return rows.map(
      (r) =>
        ({
          patientId: String(r.patient_id),
          patientName: String(r.patient_name),
          circleId: String(r.circle_id),
        }) satisfies CareCirclePatientLink,
    )
  }

  async linkPatient(circleId: string, patientId: string) {
    await this.pool.query(
      `INSERT INTO patient_circle_links (patient_id, circle_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [patientId, circleId],
    )
  }

  async unlinkPatient(circleId: string, patientId: string) {
    const { rowCount } = await this.pool.query(
      `DELETE FROM patient_circle_links WHERE circle_id = $1 AND patient_id = $2`,
      [circleId, patientId],
    )
    return (rowCount ?? 0) > 0
  }

  async getDetail(circleId: string, accountId: string): Promise<CareCircleDetail | null> {
    const member = await this.findMember(circleId, accountId)
    if (!member) return null
    const circle = await this.findById(circleId)
    if (!circle) return null
    const members = await this.listMembers(circleId)
    const patients = await this.listPatients(circleId)
    return { circle, memberRole: member.role, members, patients }
  }
}
