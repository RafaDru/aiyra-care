import type { SyncCompletionEvent } from '../../infrastructure/sync/sync-completion.types.js'
import {
  shouldEscalateSyncFailures,
  shouldNotifyEscalation,
  SYNC_ESCALATION_MESSAGES,
} from '../../domain/user-escalation/sync-escalation.policy.js'
import type { UserEscalationPgRepository } from '../../infrastructure/persistence/user-escalation.pg.repository.js'
import type { ProductEventService } from '../telemetry/product-event.service.js'
import {
  buildUserEscalationPayload,
  dispatchUserEscalation,
} from './user-escalation-dispatch.js'
import type {
  AccountNotificationPreferences,
  SyncEscalationIncident,
} from '../../domain/user-escalation/user-escalation.types.js'

export class UserEscalationService {
  constructor(
    private readonly repo: UserEscalationPgRepository,
    private readonly productEvents?: ProductEventService,
  ) {}

  async getPreferences(accountId: string): Promise<AccountNotificationPreferences> {
    return this.repo.getPreferences(accountId)
  }

  async updatePreferences(
    accountId: string,
    syncEscalationEmail: boolean,
  ): Promise<AccountNotificationPreferences> {
    return this.repo.upsertPreferences(accountId, syncEscalationEmail)
  }

  async listOpenIncidents(accountId: string): Promise<SyncEscalationIncident[]> {
    return this.repo.listOpenIncidents(accountId)
  }

  async handleSyncTerminal(
    event: Omit<SyncCompletionEvent, 'patientId'>,
    patientId: string,
  ): Promise<void> {
    if (event.status === 'success') {
      await this.handleSyncSuccess(event, patientId)
      return
    }
    await this.handleSyncFailure(event, patientId)
  }

  private async handleSyncSuccess(
    event: Omit<SyncCompletionEvent, 'patientId'>,
    patientId: string,
  ): Promise<void> {
    const resolved = await this.repo.resolveOpenIncident(event.integrationLinkId)
    if (!resolved?.lastNotifiedAt) return

    const accountIds = await this.repo.resolveAccountIdsForPatient(patientId)
    for (const accountId of accountIds) {
      const prefs = await this.repo.getPreferences(accountId)
      if (!prefs.syncEscalationEmail) continue
      await this.notifyAccount(accountId, 'resolved', event.portalType, resolved.id)
    }
  }

  private async handleSyncFailure(
    event: Omit<SyncCompletionEvent, 'patientId'>,
    patientId: string,
  ): Promise<void> {
    const failedCount = await this.repo.countFailedJobs24h(event.integrationLinkId)
    if (!shouldEscalateSyncFailures(failedCount)) return

    const accountIds = await this.repo.resolveAccountIdsForPatient(patientId)
    if (!accountIds.length) return

    for (const accountId of accountIds) {
      const prefs = await this.repo.getPreferences(accountId)
      if (!prefs.syncEscalationEmail) continue

      const incident = await this.repo.upsertOpenIncident({
        accountId,
        integrationLinkId: event.integrationLinkId,
        portalType: event.portalType,
        failureCount: failedCount,
      })

      if (!shouldNotifyEscalation(incident.lastNotifiedAt)) continue

      const sent = await this.notifyAccount(accountId, 'open', event.portalType, incident.id)
      if (sent) {
        await this.repo.markNotified(incident.id)
      }
    }
  }

  private async notifyAccount(
    accountId: string,
    status: 'open' | 'resolved',
    portalType: string,
    incidentId: string,
  ): Promise<boolean> {
    const message = status === 'open'
      ? SYNC_ESCALATION_MESSAGES.open
      : SYNC_ESCALATION_MESSAGES.resolved

    let dispatched = false
    try {
      dispatched = await dispatchUserEscalation(buildUserEscalationPayload(status, message))
    } catch {
      // webhook failure must not break sync
      dispatched = false
    }

    if (this.productEvents) {
      try {
        await this.productEvents.ingest(accountId, [{
          eventName: status === 'open' ? 'sync_escalation_opened' : 'sync_escalation_resolved',
          properties: {
            portal_type: portalType.slice(0, 32),
            kind: status,
            incident_id: incidentId.slice(0, 36),
          },
        }])
      } catch {
        // telemetry must not break sync
      }
    }

    return dispatched
  }
}
