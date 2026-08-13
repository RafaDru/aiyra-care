import { createHash, randomBytes } from 'node:crypto'
import type { Pool } from 'pg'
import type { PatientContextService } from './patient-context.service.js'
import type { PatientClinicalExportMode } from './patient-context.types.js'

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export class ClinicalExportShareService {
  constructor(
    private readonly pool: Pool,
    private readonly contextService: PatientContextService,
  ) {}

  async createShare(args: {
    patientId: string
    mode: PatientClinicalExportMode
    createdBy?: string | null
    ttlMs?: number
  }): Promise<{ token: string; expiresAt: string; shareUrl: string }> {
    const token = randomBytes(32).toString('base64url')
    const tokenHash = hashToken(token)
    const expiresAt = new Date(Date.now() + (args.ttlMs ?? DEFAULT_TTL_MS))

    await this.pool.query(
      `INSERT INTO clinical_export_shares (patient_id, token_hash, mode, expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [args.patientId, tokenHash, args.mode, expiresAt.toISOString(), args.createdBy ?? null],
    )

    const base = process.env.PUBLIC_WEB_URL ?? 'http://localhost:5173'
    return {
      token,
      expiresAt: expiresAt.toISOString(),
      shareUrl: `${base.replace(/\/$/, '')}/clinical-export/${token}`,
    }
  }

  async resolveToken(token: string): Promise<{
    patientId: string
    mode: PatientClinicalExportMode
    export: Awaited<ReturnType<PatientContextService['buildClinicalExport']>>
  } | null> {
    const tokenHash = hashToken(token)
    const { rows } = await this.pool.query<{
      patient_id: string
      mode: PatientClinicalExportMode
      expires_at: Date
    }>(
      `SELECT patient_id, mode, expires_at FROM clinical_export_shares
       WHERE token_hash = $1 AND expires_at > NOW()`,
      [tokenHash],
    )
    if (!rows.length) return null

    const row = rows[0]
    const clinicalExport = await this.contextService.buildClinicalExport(row.patient_id, row.mode)
    return { patientId: row.patient_id, mode: row.mode, export: clinicalExport }
  }
}
