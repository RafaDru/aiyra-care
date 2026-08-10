import type { FastifyReply } from 'fastify'
import type { MedicalRecordService } from '../../../application/medical-record/medical-record.service.js'
import type { CarePlaceService } from '../../../application/care-place/care-place.service.js'
import { scheduleCanonicalEntityProjection } from '../../graph/canonical-entity-graph.js'
import { createMedicalRecordSchema, updateMedicalRecordSchema, medicalRecordParamsSchema, medicalRecordQuerySchema } from './medical-record.schema.js'
import { NotFoundError } from '../../../domain/errors.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { assertPatientAccess, filterByPatientAccess } from '../auth/patient-access.guard.js'
import { guardPatientEntity } from '../auth/patient-entity.guard.js'

export class MedicalRecordController {
  constructor(
    private readonly service: MedicalRecordService,
    private readonly carePlaces?: CarePlaceService,
  ) {}

  async create(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = createMedicalRecordSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.patientId)) return
    const record = await this.service.create(parsed.data)
    await this.carePlaces?.recordUsage(parsed.data.clinicName)
    const json = record.toJSON()
    scheduleCanonicalEntityProjection({
      patientId: json.patientId,
      entityType: 'medical_record',
      entityId: json.id,
      title: json.doctorName ?? json.specialty ?? json.clinicName ?? 'Consulta',
      date: json.recordDate.toISOString(),
      source: json.source,
    })
    return reply.status(201).send(json)
  }

  async findById(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = medicalRecordParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try {
      const r = await this.service.findById(parsed.data.id)
      if (!guardPatientEntity(req, reply, r)) return
      return reply.send(r.toJSON())
    } catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }

  async findAll(req: AuthenticatedRequest, reply: FastifyReply) {
    const query = medicalRecordQuerySchema.safeParse(req.query)
    const filter = query.success ? query.data : undefined
    if (filter?.patientId && !assertPatientAccess(req, reply, filter.patientId)) return
    const items = await this.service.findAll(filter)
    return reply.send(filterByPatientAccess(req, items, (i) => i.patientId).map((i) => i.toJSON()))
  }

  async update(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = medicalRecordParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = updateMedicalRecordSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const existing = await this.service.findById(params.data.id)
      if (!guardPatientEntity(req, reply, existing)) return
      const r = await this.service.update(params.data.id, body.data)
      await this.carePlaces?.recordUsage(body.data.clinicName)
      return reply.send(r.toJSON())
    } catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }

  async delete(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = medicalRecordParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try {
      const existing = await this.service.findById(parsed.data.id)
      if (!guardPatientEntity(req, reply, existing)) return
      await this.service.delete(parsed.data.id)
      return reply.status(204).send()
    } catch (err) { return err instanceof NotFoundError ? reply.status(404).send({ message: err.message }) : [] }
  }
}
