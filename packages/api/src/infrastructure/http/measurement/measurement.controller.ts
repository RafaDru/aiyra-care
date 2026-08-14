import type { FastifyReply } from 'fastify'
import type { MeasurementService } from '../../../application/measurement/measurement.service.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { assertPatientAccess } from '../auth/patient-access.guard.js'
import { guardPatientEntity } from '../auth/patient-entity.guard.js'
import { NotFoundError } from '../../../domain/errors.js'
import {
  measurementQuerySchema,
  createObservationSchema,
  batchObservationSchema,
  observationParamsSchema,
  chartSeriesQuerySchema,
  createAdministrationSchema,
  administrationQuerySchema,
  administrationParamsSchema,
  timelineQuerySchema,
  parseMeasurementQuery,
  parseChartCategories,
} from './measurement.schema.js'

export class MeasurementController {
  constructor(private readonly service: MeasurementService) {}

  async listTypes(_req: AuthenticatedRequest, reply: FastifyReply) {
    const types = await this.service.listTypes()
    return reply.send(types.map((t) => t.toJSON()))
  }

  async listObservations(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = measurementQuerySchema.safeParse(req.query)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.patientId)) return
    const filter = parseMeasurementQuery(parsed.data)
    const rows = await this.service.findObservations(filter)
    return reply.send(rows.map((r) => r.toJSON()))
  }

  async createObservation(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = createObservationSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.patientId)) return
    const row = await this.service.createObservation(parsed.data)
    return reply.status(201).send(row.toJSON())
  }

  async createBatch(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = batchObservationSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.patientId)) return
    const rows = await this.service.createObservationBatch(
      parsed.data.patientId,
      parsed.data.observedAt,
      parsed.data.items,
      { healthThreadId: parsed.data.healthThreadId },
    )
    return reply.status(201).send(rows.map((r) => r.toJSON()))
  }

  async deleteObservation(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = observationParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    try {
      const existing = await this.service.findObservationById(params.data.id)
      if (!guardPatientEntity(req, reply, existing)) return
      await this.service.deleteObservation(params.data.id)
      return reply.status(204).send()
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }

  async chartSeries(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = chartSeriesQuerySchema.safeParse(req.query)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.patientId)) return
    const series = await this.service.chartSeries(parsed.data.patientId, {
      from: parsed.data.from,
      to: parsed.data.to,
      healthThreadId: parsed.data.healthThreadId,
      categories: parseChartCategories(parsed.data.categories),
    })
    return reply.send({ series })
  }

  async timeline(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = timelineQuerySchema.safeParse(req.query)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.patientId)) return
    const rows = await this.service.monitoringTimeline(parsed.data.patientId, {
      from: parsed.data.from,
      to: parsed.data.to,
      healthThreadId: parsed.data.healthThreadId,
    })
    return reply.send(rows)
  }

  async listAdministrations(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = administrationQuerySchema.safeParse(req.query)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.patientId)) return
    const rows = await this.service.findAdministrations({
      patientId: parsed.data.patientId,
      healthThreadId: parsed.data.healthThreadId,
      from: parsed.data.from,
      to: parsed.data.to,
    })
    return reply.send(rows.map((r) => r.toJSON()))
  }

  async createAdministration(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = createAdministrationSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.patientId)) return
    const row = await this.service.createAdministration(parsed.data)
    return reply.status(201).send(row.toJSON())
  }

  async deleteAdministration(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = administrationParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    try {
      const existing = await this.service.findAdministrationById(params.data.id)
      if (!guardPatientEntity(req, reply, existing)) return
      await this.service.deleteAdministration(params.data.id)
      return reply.status(204).send()
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }
}
