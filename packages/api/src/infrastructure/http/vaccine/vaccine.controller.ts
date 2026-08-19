import type { FastifyReply } from 'fastify'
import type { VaccineService } from '../../../application/vaccine/vaccine.service.js'
import type { CarePlaceService } from '../../../application/care-place/care-place.service.js'
import { createVaccineSchema, updateVaccineSchema, vaccineParamsSchema, vaccineQuerySchema } from './vaccine.schema.js'
import { NotFoundError } from '../../../domain/errors.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { assertPatientAccess, filterByPatientAccess } from '../auth/patient-access.guard.js'
import { guardPatientEntity } from '../auth/patient-entity.guard.js'

export class VaccineController {
  constructor(
    private readonly service: VaccineService,
    private readonly carePlaces?: CarePlaceService,
    private readonly hygieneDetector?: import('../../../application/hygiene/hygiene-detector.service.js').HygieneDetectorService,
  ) {}

  async create(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = createVaccineSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.patientId)) return
    const vaccine = await this.service.create(parsed.data)
    await this.carePlaces?.recordUsage(parsed.data.clinic)
    void this.hygieneDetector?.scanAfterVaccineUpsert(vaccine).catch(() => undefined)
    return reply.status(201).send(vaccine.toJSON())
  }

  async findById(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = vaccineParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try {
      const vaccine = await this.service.findById(parsed.data.id)
      if (!guardPatientEntity(req, reply, vaccine)) return
      return reply.send(vaccine.toJSON())
    } catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }

  async findAll(req: AuthenticatedRequest, reply: FastifyReply) {
    const query = vaccineQuerySchema.safeParse(req.query)
    const filter = query.success ? query.data : undefined
    if (filter?.patientId && !assertPatientAccess(req, reply, filter.patientId)) return
    const vaccines = await this.service.findAll(filter)
    return reply.send(filterByPatientAccess(req, vaccines, (v) => v.patientId).map((v) => v.toJSON()))
  }

  async update(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = vaccineParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = updateVaccineSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const existing = await this.service.findById(params.data.id)
      if (!guardPatientEntity(req, reply, existing)) return
      const vaccine = await this.service.update(params.data.id, body.data)
      await this.carePlaces?.recordUsage(body.data.clinic)
      return reply.send(vaccine.toJSON())
    } catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }

  async delete(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = vaccineParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try {
      const existing = await this.service.findById(parsed.data.id)
      if (!guardPatientEntity(req, reply, existing)) return
      await this.service.delete(parsed.data.id)
      return reply.status(204).send()
    } catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }
}
