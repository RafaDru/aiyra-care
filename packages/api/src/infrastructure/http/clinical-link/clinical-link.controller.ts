import type { FastifyReply } from 'fastify'
import type { ClinicalLinkService } from '../../../application/clinical-link/clinical-link.service.js'
import type { HealthThreadService } from '../../../application/health-thread/health-thread.service.js'
import {
  createClinicalLinkSchema,
  clinicalLinkParamsSchema,
  clinicalLinkQuerySchema,
  patientIdParamsSchema,
  relationTypeQuerySchema,
  threadFlowParamsSchema,
} from './clinical-link.schema.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { assertPatientAccess } from '../auth/patient-access.guard.js'
import { guardPatientEntity } from '../auth/patient-entity.guard.js'
import { NotFoundError } from '../../../domain/errors.js'

export class ClinicalLinkController {
  constructor(
    private readonly service: ClinicalLinkService,
    private readonly threadService?: HealthThreadService,
  ) {}

  async listRelationTypes(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = relationTypeQuerySchema.safeParse(req.query)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const types = await this.service.listRelationTypes(
      parsed.data.fromEntityType,
      parsed.data.toEntityType,
    )
    return reply.send(types)
  }

  async create(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = patientIdParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    if (!assertPatientAccess(req, reply, params.data.patientId)) return

    const body = createClinicalLinkSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    try {
      const link = await this.service.create({
        patientId: params.data.patientId,
        ...body.data,
        createdBy: req.accountId ?? undefined,
      })
      return reply.status(201).send(link)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar vínculo'
      if (err instanceof NotFoundError) return reply.status(404).send({ message })
      return reply.status(400).send({ message })
    }
  }

  async list(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = patientIdParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    if (!assertPatientAccess(req, reply, params.data.patientId)) return

    const query = clinicalLinkQuerySchema.safeParse(req.query)
    if (!query.success) return reply.status(400).send({ error: query.error.flatten() })

    const links = await this.service.listForPatient(
      params.data.patientId,
      query.data.entityType,
      query.data.entityId,
    )
    return reply.send(links)
  }

  async counts(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = patientIdParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    if (!assertPatientAccess(req, reply, params.data.patientId)) return

    const counts = await this.service.linkCounts(params.data.patientId)
    return reply.send(counts)
  }

  async delete(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = clinicalLinkParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })

    try {
      const link = await this.service.getById(params.data.id)
      if (!assertPatientAccess(req, reply, link.patientId)) return
      await this.service.delete(params.data.id, link.patientId)
      return reply.status(204).send()
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }

  async threadFlow(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!this.threadService) return reply.status(503).send({ message: 'Thread service unavailable' })
    const params = threadFlowParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })

    try {
      const thread = await this.threadService.findById(params.data.id)
      if (!guardPatientEntity(req, reply, thread)) return
      const flow = await this.service.getThreadClinicalFlow(params.data.id)
      return reply.send(flow)
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }
}
