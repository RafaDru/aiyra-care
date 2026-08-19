import type { Pool } from 'pg'
import type {
  HygieneCandidate,
  HygieneCandidatePairInput,
  HygieneCandidateStatus,
  HygieneResolveDecision,
} from '../../domain/hygiene/hygiene.types.js'
import type { HygieneRepository } from '../../domain/hygiene/hygiene.repository.js'

function orderedIds(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

function mapRow(row: Record<string, unknown>): HygieneCandidate {
  return {
    id: row.id as string,
    accountId: row.account_id as string,
    patientId: row.patient_id as string,
    entityType: row.entity_type as HygieneCandidate['entityType'],
    entityIdA: row.entity_id_a as string,
    entityIdB: row.entity_id_b as string,
    detector: row.detector as string,
    score: Number(row.score),
    status: row.status as HygieneCandidate['status'],
    evidence: (row.evidence as Record<string, unknown>) ?? {},
    resolvedBy: row.resolved_by as string | null,
    resolvedAt: row.resolved_at ? new Date(row.resolved_at as string) : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

export class HygienePgRepository implements HygieneRepository {
  constructor(private readonly pool: Pool) {}

  async upsertCandidate(input: HygieneCandidatePairInput): Promise<HygieneCandidate | null> {
    const [entityIdA, entityIdB] = orderedIds(input.entityIdA, input.entityIdB)
    const { rows } = await this.pool.query(
      `INSERT INTO hygiene_candidates (
         account_id, patient_id, entity_type, entity_id_a, entity_id_b,
         detector, score, evidence, status
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,'pending')
       ON CONFLICT (entity_type, entity_id_a, entity_id_b) DO UPDATE SET
         score = GREATEST(hygiene_candidates.score, EXCLUDED.score),
         detector = EXCLUDED.detector,
         evidence = EXCLUDED.evidence,
         updated_at = NOW()
       WHERE hygiene_candidates.status = 'pending'
       RETURNING *`,
      [
        input.accountId,
        input.patientId,
        input.entityType,
        entityIdA,
        entityIdB,
        input.detector,
        input.score,
        JSON.stringify(input.evidence ?? {}),
      ],
    )
    if (!rows.length) {
      const existing = await this.pool.query(
        `SELECT * FROM hygiene_candidates
         WHERE entity_type = $1 AND entity_id_a = $2 AND entity_id_b = $3`,
        [input.entityType, entityIdA, entityIdB],
      )
      return existing.rows[0] ? mapRow(existing.rows[0] as Record<string, unknown>) : null
    }
    return mapRow(rows[0] as Record<string, unknown>)
  }

  async listForAccount(
    accountId: string,
    opts?: { status?: HygieneCandidateStatus; patientId?: string; limit?: number },
  ): Promise<HygieneCandidate[]> {
    const limit = Math.min(200, opts?.limit ?? 50)
    const params: unknown[] = [accountId]
    let sql = `SELECT * FROM hygiene_candidates WHERE account_id = $1`
    if (opts?.status) {
      params.push(opts.status)
      sql += ` AND status = $${params.length}`
    }
    if (opts?.patientId) {
      params.push(opts.patientId)
      sql += ` AND patient_id = $${params.length}`
    }
    sql += ` ORDER BY score DESC, created_at DESC LIMIT $${params.length + 1}`
    params.push(limit)
    const { rows } = await this.pool.query(sql, params)
    return rows.map((r) => mapRow(r as Record<string, unknown>))
  }

  async findById(id: string): Promise<HygieneCandidate | null> {
    const { rows } = await this.pool.query(`SELECT * FROM hygiene_candidates WHERE id = $1`, [id])
    return rows[0] ? mapRow(rows[0] as Record<string, unknown>) : null
  }

  async resolve(
    id: string,
    decision: HygieneResolveDecision,
    resolvedBy: string,
  ): Promise<HygieneCandidate | null> {
    const { rows } = await this.pool.query(
      `UPDATE hygiene_candidates
       SET status = $2, resolved_by = $3, resolved_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, decision, resolvedBy],
    )
    return rows[0] ? mapRow(rows[0] as Record<string, unknown>) : null
  }

  async countPending(accountId: string): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT COUNT(*)::int AS n FROM hygiene_candidates
       WHERE account_id = $1 AND status = 'pending'`,
      [accountId],
    )
    return Number(rows[0]?.n ?? 0)
  }
}

export class PatientAccountPgResolver {
  constructor(private readonly pool: Pool) {}

  async resolveAccountIdForPatient(patientId: string): Promise<string | null> {
    const { rows } = await this.pool.query(
      `SELECT owner_account_id FROM patients WHERE id = $1`,
      [patientId],
    )
    const owner = rows[0]?.owner_account_id as string | undefined
    if (owner) return owner
    const mem = await this.pool.query(
      `SELECT account_id FROM patient_memberships WHERE patient_id = $1 ORDER BY created_at LIMIT 1`,
      [patientId],
    )
    return (mem.rows[0]?.account_id as string) ?? null
  }
}

export class PatientBirthDatePgResolver {
  constructor(private readonly pool: Pool) {}

  async resolveBirthDateForPatient(patientId: string): Promise<string | null> {
    const { rows } = await this.pool.query(`SELECT birth_date FROM patients WHERE id = $1`, [patientId])
    const bd = rows[0]?.birth_date
    if (!bd) return null
    return bd instanceof Date ? bd.toISOString().slice(0, 10) : String(bd).slice(0, 10)
  }
}
