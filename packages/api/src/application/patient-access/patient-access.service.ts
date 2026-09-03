import type { Pool } from 'pg'
import type { PatientAccessGrantRepository } from '../../domain/patient-access/patient-access.repository.js'
import type { PatientMembershipRepository } from '../../domain/auth/app-account.repository.js'
import type { PatientAccessLevel, PatientMembershipRole } from '../../domain/patient-access/patient-access.types.js'
import type { PatientAccessGrantData } from '../../domain/patient-access/patient-access.types.js'

/** Co-admins com acesso total além do titular (MVP assinatura familiar). */
export const MAX_FULL_GUARDIAN_GRANTS = 2

export class PatientAccessService {
  constructor(
    private readonly grants: PatientAccessGrantRepository,
    private readonly memberships: PatientMembershipRepository,
    private readonly pool: Pool,
  ) {}

  async listGrants(patientId: string, actorAccountId: string): Promise<PatientAccessGrantData[]> {
    await this.assertHasAccess(patientId, actorAccountId)
    return this.grants.listActiveForPatient(patientId)
  }

  async grantAccess(input: {
    patientId: string
    actorAccountId: string
    targetAccountId: string
    accessLevel?: PatientAccessLevel
    membershipRole?: PatientMembershipRole
  }): Promise<PatientAccessGrantData> {
    await this.assertCanManage(input.patientId, input.actorAccountId)

    if (input.targetAccountId === input.actorAccountId) {
      throw new Error('PATIENT_ACCESS_SELF_GRANT')
    }

    const accessLevel = input.accessLevel ?? 'full'
    const membershipRole = input.membershipRole ?? 'guardian'

    if (membershipRole === 'self') {
      throw new Error('PATIENT_ACCESS_INVALID_ROLE')
    }

    const existing = await this.grants.findActive(input.patientId, input.targetAccountId)
    if (
      accessLevel === 'full' &&
      !existing &&
      (await this.grants.countActiveFullGrants(input.patientId)) >= MAX_FULL_GUARDIAN_GRANTS
    ) {
      throw new Error('PATIENT_ACCESS_ADMIN_LIMIT')
    }

    await this.memberships.ensureMembership(input.targetAccountId, input.patientId, membershipRole)

    return this.grants.upsertActive({
      patientId: input.patientId,
      accountId: input.targetAccountId,
      accessLevel,
      membershipRole,
      grantedBy: input.actorAccountId,
    })
  }

  async revokeGrant(patientId: string, grantId: string, actorAccountId: string): Promise<void> {
    await this.assertCanManage(patientId, actorAccountId)

    const grant = await this.grants.findById(grantId)
    if (!grant || grant.patientId !== patientId || grant.revokedAt) {
      throw new Error('PATIENT_ACCESS_GRANT_NOT_FOUND')
    }

    if (grant.membershipRole === 'self') {
      throw new Error('PATIENT_ACCESS_CANNOT_REVOKE_SELF')
    }

    const ownerId = await this.getOwnerAccountId(patientId)
    if (ownerId && grant.accountId === ownerId) {
      throw new Error('PATIENT_ACCESS_CANNOT_REVOKE_OWNER')
    }

    const revoked = await this.grants.revoke(grantId)
    if (!revoked) throw new Error('PATIENT_ACCESS_GRANT_NOT_FOUND')

    await this.pool.query(
      `DELETE FROM patient_memberships WHERE account_id = $1 AND patient_id = $2`,
      [grant.accountId, patientId],
    )
  }

  private async assertHasAccess(patientId: string, actorAccountId: string) {
    const ids = await this.grants.listAccessiblePatientIds(actorAccountId)
    if (!ids.includes(patientId)) throw new Error('PATIENT_ACCESS_FORBIDDEN')
  }

  private async assertCanManage(patientId: string, actorAccountId: string) {
    const ownerId = await this.getOwnerAccountId(patientId)
    if (!ownerId || ownerId !== actorAccountId) {
      throw new Error('PATIENT_ACCESS_FORBIDDEN')
    }
  }

  private async getOwnerAccountId(patientId: string): Promise<string | null> {
    const { rows } = await this.pool.query(
      `SELECT owner_account_id::text AS owner_account_id FROM patients WHERE id = $1`,
      [patientId],
    )
    return rows[0]?.owner_account_id ?? null
  }
}
