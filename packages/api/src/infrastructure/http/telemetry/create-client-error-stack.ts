import type { Pool } from 'pg'
import { ClientErrorService } from '../../../application/telemetry/client-error.service.js'
import { ClientErrorPgRepository } from '../../persistence/client-error.pg.repository.js'
import { OpsAnalysisQueuePgRepository } from '../../persistence/ops-analysis-queue.pg.repository.js'
import { OpsAnalysisQueueService } from '../../../application/ops/ops-analysis-queue.service.js'
import { ClientErrorIncidentSignalPgRepository } from '../../persistence/client-error-incident-signal.pg.repository.js'
import { ClientErrorIncidentBridgeService } from '../../../application/ops/client-error-incident-bridge.service.js'
import { createIncidentDispatchService } from '../../../application/ops/incident-dispatch.service.js'

export function createClientErrorIngestStack(pool: Pool): {
  clientErrors: ClientErrorService
  bridge: ClientErrorIncidentBridgeService
} {
  const bridge = ClientErrorIncidentBridgeService.fromEnv(
    new ClientErrorIncidentSignalPgRepository(pool),
    new OpsAnalysisQueueService(new OpsAnalysisQueuePgRepository(pool)),
    createIncidentDispatchService(pool),
  )
  const clientErrors = new ClientErrorService(new ClientErrorPgRepository(pool), bridge)
  return { clientErrors, bridge }
}
