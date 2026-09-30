import type { Pool } from 'pg'
import {
  resolveDefectFixAutomationWebhookKey,
  resolveDefectFixAutomationWebhookUrl,
  resolveDevelopmentSupportAutomationWebhookKey,
  resolveDevelopmentSupportAutomationWebhookUrl,
  resolveSreSupportAutomationWebhookKey,
  resolveSreSupportAutomationWebhookUrl,
} from '../../domain/ops/cursor-automation-env.js'
import { IncidentDispatchOutboxPgRepository } from '../../infrastructure/persistence/incident-dispatch-outbox.pg.repository.js'
import { OpsAnalysisQueuePgRepository } from '../../infrastructure/persistence/ops-analysis-queue.pg.repository.js'

/** Idade mínima «open» sem linha outbox — banner saúde (1h). */
export const INCIDENT_DISPATCH_HEALTH_STALE_OPEN_MS = 3_600_000

export type IncidentDispatchHealth = {
  deadCount: number
  staleOpenWithoutOutboxCount: number
  webhooks: {
    developmentSupport: { urlConfigured: boolean; keyConfigured: boolean; ready: boolean }
    sreSupport: { urlConfigured: boolean; keyConfigured: boolean; ready: boolean }
    defectFix: { urlConfigured: boolean; keyConfigured: boolean; ready: boolean }
  }
  /** true se alguma lane de triagem/correção não tem URL+key no processo atual */
  anyWebhookMissing: boolean
}

export function resolveIncidentDispatchWebhookFlags(
  env: NodeJS.ProcessEnv = process.env,
): IncidentDispatchHealth['webhooks'] {
  const devUrl = resolveDevelopmentSupportAutomationWebhookUrl(env)
  const devKey = resolveDevelopmentSupportAutomationWebhookKey(env)
  const sreUrl = resolveSreSupportAutomationWebhookUrl(env)
  const sreKey = resolveSreSupportAutomationWebhookKey(env)
  const defectUrl = resolveDefectFixAutomationWebhookUrl(env)
  const defectKey = resolveDefectFixAutomationWebhookKey(env)
  return {
    developmentSupport: {
      urlConfigured: Boolean(devUrl),
      keyConfigured: Boolean(devKey),
      ready: Boolean(devUrl && devKey),
    },
    sreSupport: {
      urlConfigured: Boolean(sreUrl),
      keyConfigured: Boolean(sreKey),
      ready: Boolean(sreUrl && sreKey),
    },
    defectFix: {
      urlConfigured: Boolean(defectUrl),
      keyConfigured: Boolean(defectKey),
      ready: Boolean(defectUrl && defectKey),
    },
  }
}

export async function getIncidentDispatchHealth(pool: Pool): Promise<IncidentDispatchHealth> {
  const outbox = new IncidentDispatchOutboxPgRepository(pool)
  const queue = new OpsAnalysisQueuePgRepository(pool)
  const webhooks = resolveIncidentDispatchWebhookFlags()
  const [deadCount, staleOpenWithoutOutboxCount] = await Promise.all([
    outbox.countByStatus('dead'),
    queue.countStaleOpenWithoutOutbox(INCIDENT_DISPATCH_HEALTH_STALE_OPEN_MS),
  ])
  return {
    deadCount,
    staleOpenWithoutOutboxCount,
    webhooks,
    anyWebhookMissing:
      !webhooks.developmentSupport.ready
      || !webhooks.sreSupport.ready
      || !webhooks.defectFix.ready,
  }
}
