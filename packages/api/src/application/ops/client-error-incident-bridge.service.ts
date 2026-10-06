import type { ClientErrorInput } from '../../domain/telemetry/client-error.js'
import {
  apiPathMatchesIncidentPrefixes,
  inferServerErrorBridgeFeature,
  resolveBridgeIngressFeature,
  resolveClientErrorIncidentBridgeConfig,
  ruleForFeature,
} from '../../domain/ops/client-error-incident-bridge.config.js'
import type { ClientErrorIncidentBridgeConfig } from '../../domain/ops/client-error-incident-bridge.types.js'
import type { OpsAnalysisQueueService } from './ops-analysis-queue.service.js'
import type { IncidentDispatchService } from './incident-dispatch.service.js'
import type { ClientErrorIncidentSignalPgRepository } from '../../infrastructure/persistence/client-error-incident-signal.pg.repository.js'
import {
  computeClientErrorFingerprint,
  sanitizeClientErrorCode,
  sanitizeClientErrorFeature,
} from '../../domain/telemetry/client-error.js'
import { isOpsPlannedMaintenanceActive } from '../../domain/ops/ops-planned-maintenance.js'

export interface ClientErrorBridgeContext {
  accountId: string | null
  deploymentTier: string
}

export class ClientErrorIncidentBridgeService {
  constructor(
    private readonly config: ClientErrorIncidentBridgeConfig,
    private readonly signals: ClientErrorIncidentSignalPgRepository,
    private readonly queueService: OpsAnalysisQueueService,
    private readonly incidentDispatch?: IncidentDispatchService,
  ) {}

  static fromEnv(
    signals: ClientErrorIncidentSignalPgRepository,
    queueService: OpsAnalysisQueueService,
    incidentDispatch?: IncidentDispatchService,
    env?: NodeJS.ProcessEnv,
  ): ClientErrorIncidentBridgeService {
    return new ClientErrorIncidentBridgeService(
      resolveClientErrorIncidentBridgeConfig(env),
      signals,
      queueService,
      incidentDispatch,
    )
  }

  isEnabled(): boolean {
    return this.config.enabled
  }

  async onIngestedErrors(
    errors: ClientErrorInput[],
    ctx: ClientErrorBridgeContext,
  ): Promise<void> {
    if (!this.config.enabled) return
    if (isOpsPlannedMaintenanceActive()) return
    for (const error of errors) {
      await this.maybeEnqueueFromClientError(error, ctx).catch(() => undefined)
    }
  }

  async handleServerError(input: {
    path: string
    statusCode: number
    accountId: string | null
    deploymentTier: string
  }): Promise<void> {
    if (!this.config.enabled) return
    if (isOpsPlannedMaintenanceActive()) return
    if (input.statusCode < 500) return
    if (!apiPathMatchesIncidentPrefixes(input.path, this.config)) return

    const feature = inferServerErrorBridgeFeature(input.path)
    const errorCode = sanitizeClientErrorCode(`HTTP_${input.statusCode}`)
    const errorKind = 'api' as const
    const fingerprint = computeClientErrorFingerprint(feature, errorKind, errorCode)
    const properties = { api_path: input.path.split('?')[0].slice(0, 128), http_status: input.statusCode }

    await this.maybeEnqueueFromClientError(
      {
        fingerprint,
        feature,
        errorKind,
        errorCode,
        properties,
      },
      { accountId: input.accountId, deploymentTier: input.deploymentTier },
    )
  }

  private async maybeEnqueueFromClientError(
    error: ClientErrorInput,
    ctx: ClientErrorBridgeContext,
  ): Promise<void> {
    const feature = sanitizeClientErrorFeature(error.feature)
    if (!feature) return

    const bridgeFeature = resolveBridgeIngressFeature(feature, error.properties)
    const rule = ruleForFeature(this.config, feature, error.properties)
    if (!rule) return

    const slot = await this.signals.tryAcquireEnqueueSlot(
      error.fingerprint,
      ctx.deploymentTier,
      this.config.dedupeMs,
      rule.minCountWindow,
    )
    if (!slot.acquired) return

    const apiPath = typeof error.properties?.api_path === 'string'
      ? error.properties.api_path
      : undefined

    const item = await this.queueService.enqueueClientErrorSignal({
      fingerprint: error.fingerprint,
      feature: bridgeFeature,
      errorCode: error.errorCode,
      errorKind: error.errorKind,
      route: error.route ?? null,
      apiPath: apiPath ?? null,
      deploymentTier: ctx.deploymentTier,
      lane: rule.lane,
    })

    await this.signals.attachQueueId(error.fingerprint, ctx.deploymentTier, item.id)

    if (this.incidentDispatch) {
      await this.incidentDispatch.ensureOutboxForQueueRecord(item).catch(() => undefined)
    }
  }
}
