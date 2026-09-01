import type { Pool } from 'pg'
import type { IntegrationLink } from '../../domain/integration-link/integration-link.entity.js'
import { IntegrationLinkPgRepository } from '../../infrastructure/persistence/integration-link.pg.repository.js'
import { PatientPgRepository } from '../../infrastructure/persistence/patient.pg.repository.js'
import { PlanMembershipPgRepository } from '../../infrastructure/persistence/plan-membership.pg.repository.js'
import { InsurancePlanPgRepository } from '../../infrastructure/persistence/insurance-plan.pg.repository.js'
import { isIntegrationLinkSessionReady } from './integration-link-session.js'
import { getRuntimeDegradedService } from '../ops/runtime-degraded.factory.js'

/** Portais em que um sync no titular atualiza dependentes do mesmo plano. */
const TITULAR_HOUSEHOLD_PORTALS = new Set(['amil'])

export interface IntegrationLinkSyncAuthority {
  syncAuthority: 'self' | 'titular'
  effectiveSyncLinkId: string
  managedByPatientId?: string
  managedByPatientName?: string
  effectiveLastSyncAt: Date | null
  effectiveSessionExpiresAt: Date | null
  sessionReady: boolean
  syncDegraded: boolean
}

export type IntegrationLinkWithSyncAuthority = ReturnType<IntegrationLink['toJSON']> &
  IntegrationLinkSyncAuthority

export async function enrichIntegrationLinksWithSyncAuthority(
  pool: Pool,
  patientId: string,
  links: IntegrationLink[],
): Promise<IntegrationLinkWithSyncAuthority[]> {
  const membershipRepo = new PlanMembershipPgRepository(pool)
  const planRepo = new InsurancePlanPgRepository(pool)
  const linkRepo = new IntegrationLinkPgRepository(pool)
  const patientRepo = new PatientPgRepository(pool)

  const memberships = await membershipRepo.findAll({ patientId })
  const plans = await Promise.all(
    memberships.map((m) => planRepo.findById(m.insurancePlanId)),
  )

  const results: IntegrationLinkWithSyncAuthority[] = []
  const runtime = await getRuntimeDegradedService().getPublicView()
  const degradedPortals = new Set(runtime.syncDegradedPortals)

  for (const link of links) {
    const json = link.toJSON()
    let item: IntegrationLinkWithSyncAuthority = {
      ...json,
      syncAuthority: 'self',
      effectiveSyncLinkId: link.id,
      effectiveLastSyncAt: link.lastSyncAt,
      effectiveSessionExpiresAt: link.sessionExpiresAt,
      sessionReady: isIntegrationLinkSessionReady(link),
      syncDegraded: degradedPortals.has(link.portalType),
    }

    if (TITULAR_HOUSEHOLD_PORTALS.has(link.portalType)) {
      const membership = memberships.find((m, i) => {
        if (!m.integrationLinkId) return false
        const plan = plans[i]
        const operator = plan?.operator ?? m.source
        return operator === link.portalType || m.source === link.portalType
      })

      if (membership?.integrationLinkId && membership.integrationLinkId !== link.id) {
        const holderLink = await linkRepo.findById(membership.integrationLinkId)
        if (holderLink) {
          const holderPatient = await patientRepo.findById(holderLink.patientId)
          item = {
            ...item,
            syncAuthority: 'titular',
            effectiveSyncLinkId: holderLink.id,
            managedByPatientId: holderLink.patientId,
            managedByPatientName: holderPatient?.name ?? undefined,
            effectiveLastSyncAt: holderLink.lastSyncAt,
            effectiveSessionExpiresAt: holderLink.sessionExpiresAt,
            sessionReady: isIntegrationLinkSessionReady(holderLink),
            syncDegraded: degradedPortals.has(link.portalType),
          }
        }
      }
    }

    results.push(item)
  }

  return results
}
