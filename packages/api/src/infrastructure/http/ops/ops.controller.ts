import type { FastifyReply } from 'fastify'
import type { OpsMetricsService } from '../../../application/ops/ops-metrics.service.js'
import type { OpsAlertDispatchService } from '../../../application/ops/ops-alert-dispatch.service.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'

export function resolveOpsMetricsKey(): string | undefined {
  return (
    process.env.OPS_METRICS_KEY?.trim()
    || process.env.LLM_INTERNAL_OBSERVABILITY_KEY?.trim()
    || undefined
  )
}

export function assertOpsMetricsAccess(
  req: AuthenticatedRequest,
  reply: FastifyReply,
): boolean {
  const opsKey = resolveOpsMetricsKey()
  if (!opsKey) return true
  if (req.headers['x-internal-ops-key'] === opsKey) return true
  reply.status(403).send({ error: 'ops key required', code: 'OPS_KEY_REQUIRED' })
  return false
}

export class OpsController {
  constructor(
    private readonly metrics: OpsMetricsService,
    private readonly dispatch?: OpsAlertDispatchService,
  ) {}

  async getMetrics(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!assertOpsMetricsAccess(req, reply)) return
    const result = await this.metrics.getMetrics()
    return reply.send(result)
  }

  async getAlerts(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!assertOpsMetricsAccess(req, reply)) return
    const result = await this.metrics.getMetrics()
    return reply.send({
      generatedAt: result.metrics.generatedAt,
      alerts: result.alerts,
      errorFingerprints24h: result.metrics.errorFingerprints24h,
    })
  }

  async dispatchAlerts(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!assertOpsMetricsAccess(req, reply)) return
    if (!this.dispatch) {
      return reply.status(503).send({ message: 'Dispatch não configurado' })
    }
    const result = await this.dispatch.checkAndDispatch()
    return reply.send(result)
  }
}
