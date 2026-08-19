import type { FastifyReply } from 'fastify'
import type { ExamOrderService } from '../../../application/exam-order/exam-order.service.js'
import { formatHermesPardiniCompoundPortalOrderId } from '../../../infrastructure/scraper/hermes-pardini-pedido-id.js'
import { examOrderParamsSchema, examOrderQuerySchema } from './exam-order.schema.js'
import { NotFoundError } from '../../../domain/errors.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { assertPatientAccess, filterByPatientAccess } from '../auth/patient-access.guard.js'
import { guardPatientEntity } from '../auth/patient-entity.guard.js'

export class ExamOrderController {
  constructor(private readonly service: ExamOrderService) {}

  async findAll(req: AuthenticatedRequest, reply: FastifyReply) {
    const query = examOrderQuerySchema.safeParse(req.query)
    const filter = query.success ? query.data : undefined
    if (filter?.patientId && !assertPatientAccess(req, reply, filter.patientId)) return
    const items = await this.service.findAll(filter)
    return reply.send(
      filterByPatientAccess(req, items, (i) => i.patientId).map((i) => i.toJSON()),
    )
  }

  async downloadResultFile(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = examOrderParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try {
      const order = await this.service.findById(parsed.data.id)
      if (!guardPatientEntity(req, reply, order)) return
      const path = order.resultFileUrl
      if (!path) return reply.status(404).send({ message: 'Pedido sem arquivo de laudo' })
      const file = await this.service.readResultFile(path)
      const label = order.notes
        ? (() => {
            try {
              const parsed = JSON.parse(order.notes) as { portalOrderLabel?: string }
              if (parsed.portalOrderLabel) return parsed.portalOrderLabel
            } catch { /* ignore */ }
            return null
          })()
        : null
        ?? (order.portalOrderId && order.source === 'hermes_pardini'
          ? formatHermesPardiniCompoundPortalOrderId(order.portalOrderId)
          : order.portalOrderId)
        ?? order.id.slice(0, 8)
      return reply
        .header('Content-Type', file.contentType ?? 'application/pdf')
        .header('Content-Disposition', `inline; filename="pedido-${label}.pdf"`)
        .send(file.buffer)
    } catch (err) {
      return err instanceof NotFoundError
        ? reply.status(404).send({ message: err.message })
        : reply.status(500).send({ message: err instanceof Error ? err.message : 'Erro ao baixar laudo' })
    }
  }
}
