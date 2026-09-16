import type { Pool } from 'pg'
import type { ProductEventService } from '../telemetry/product-event.service.js'
import type { PatientAccessAuditInsert, PatientAccessAuditRecord } from '../../domain/patient-access/patient-access-audit.types.js'
import { PatientAccessAuditPgRepository } from '../../infrastructure/persistence/patient-access-audit.pg.repository.js'

export class PatientAccessAuditService {
  private readonly repo: PatientAccessAuditPgRepository

  constructor(
    private readonly pool: Pool,
    private readonly productEvents?: ProductEventService,
  ) {
    this.repo = new PatientAccessAuditPgRepository(pool)
  }

  async record(input: PatientAccessAuditInsert): Promise<void> {
    try {
      await this.repo.insert(input)
    } catch {
      // auditoria não deve bloquear fluxo principal
    }

    await this.emitProductEvent(input)
  }

  async listForPatientOwner(patientId: string, actorAccountId: string): Promise<PatientAccessAuditRecord[]> {
    const ownerId = await this.getOwnerAccountId(patientId)
    if (!ownerId || ownerId !== actorAccountId) {
      throw new Error('PATIENT_ACCESS_FORBIDDEN')
    }
    return this.repo.listForPatient(patientId)
  }

  private async getOwnerAccountId(patientId: string): Promise<string | null> {
    const { rows } = await this.pool.query(
      `SELECT owner_account_id::text AS owner_account_id FROM patients WHERE id = $1`,
      [patientId],
    )
    return rows[0]?.owner_account_id ?? null
  }

  private async emitProductEvent(input: PatientAccessAuditInsert): Promise<void> {
    if (!this.productEvents) return
    const eventName =
      input.action === 'grant_created' ? 'patient_access_granted'
        : input.action === 'grant_revoked' ? 'patient_access_revoked'
          : input.action === 'invite_sent' ? 'family_invite_created'
            : input.action === 'invite_accepted' ? 'family_invite_accepted'
              : input.action === 'invite_revoked' ? 'family_invite_revoked'
                : null
    if (!eventName) return

    const { trackServerProductEvent } = await import('../telemetry/server-product-event.js')
    await trackServerProductEvent(this.productEvents, input.actorAccountId, {
      eventName,
      patientId: input.patientId,
      properties: {
        access_level: input.accessLevel ?? undefined,
        patient_count: input.patientCount ?? undefined,
        kind: input.action,
      },
    })
  }
}
