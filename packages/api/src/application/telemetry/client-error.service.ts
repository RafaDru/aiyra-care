import {
  computeClientErrorFingerprint,
  sanitizeClientErrorCode,
  sanitizeClientErrorFeature,
  sanitizeClientErrorProperties,
  CLIENT_ERROR_KIND_SET,
  type ClientErrorInput,
} from '../../domain/telemetry/client-error.js'
import type { ClientErrorPgRepository } from '../../infrastructure/persistence/client-error.pg.repository.js'
import type { ClientErrorIncidentBridgeService } from '../ops/client-error-incident-bridge.service.js'
import { resolveDeploymentTier } from '../../domain/ops/investigator-environment.js'

export interface ClientErrorIngestResult {
  accepted: number
  rejected: number
}

export class ClientErrorService {
  constructor(
    private readonly repo: ClientErrorPgRepository,
    private readonly incidentBridge?: ClientErrorIncidentBridgeService,
  ) {}

  async ingest(
    accountId: string | null,
    errors: ClientErrorInput[],
  ): Promise<ClientErrorIngestResult> {
    const accepted: ClientErrorInput[] = []
    let rejected = 0

    for (const error of errors) {
      const feature = sanitizeClientErrorFeature(error.feature)
      if (!feature || !CLIENT_ERROR_KIND_SET.has(error.errorKind)) {
        rejected += 1
        continue
      }
      const errorCode = sanitizeClientErrorCode(error.errorCode)
      const expectedFp = computeClientErrorFingerprint(feature, error.errorKind, errorCode)
      if (error.fingerprint !== expectedFp) {
        rejected += 1
        continue
      }
      accepted.push({
        ...error,
        feature,
        errorCode,
        properties: sanitizeClientErrorProperties(error.properties),
      })
    }

    if (accepted.length) {
      await this.repo.insertMany(accountId, accepted)
      if (this.incidentBridge?.isEnabled()) {
        void this.incidentBridge.onIngestedErrors(accepted, {
          accountId,
          deploymentTier: resolveDeploymentTier(),
        }).catch(() => undefined)
      }
    }

    return { accepted: accepted.length, rejected }
  }
}
