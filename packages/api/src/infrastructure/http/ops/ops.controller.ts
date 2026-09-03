import type { FastifyReply } from 'fastify'
import type { OpsMetricsService } from '../../../application/ops/ops-metrics.service.js'
import type { OpsAlertDispatchService } from '../../../application/ops/ops-alert-dispatch.service.js'
import type { DevAuditBridgeService } from '../../../application/ops/dev-audit-bridge.service.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { assertOpsMetricsAccess } from './ops-auth.js'

export class OpsController {
  constructor(
    private readonly metrics: OpsMetricsService,
    private readonly dispatch?: OpsAlertDispatchService,
    private readonly devAuditBridge?: DevAuditBridgeService,
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
      clientErrorFingerprints24h: result.metrics.clientErrorFingerprints24h,
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

  async getDevAuditBridge(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!assertOpsMetricsAccess(req, reply)) return
    if (!this.devAuditBridge) {
      return reply.status(503).send({ message: 'Dev-audit bridge não configurado' })
    }
    const hours = Number((req.query as { hours?: string })?.hours ?? process.env.DEV_AUDIT_BRIDGE_HOURS ?? '24')
    const report = await this.devAuditBridge.buildReport(Number.isFinite(hours) ? hours : 24)
    return reply.send(report)
  }
}
