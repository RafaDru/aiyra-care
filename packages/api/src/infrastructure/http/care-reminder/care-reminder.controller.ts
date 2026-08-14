import type { FastifyReply } from 'fastify'
import type { CareReminderService } from '../../../application/care-reminder/care-reminder.service.js'
import type { MeasurementService } from '../../../application/measurement/measurement.service.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { assertPatientAccess } from '../auth/patient-access.guard.js'
import { guardPatientEntity } from '../auth/patient-entity.guard.js'
import { NotFoundError } from '../../../domain/errors.js'
import {
  careReminderQuerySchema,
  createCareReminderSchema,
  illnessPackSchema,
  careReminderParamsSchema,
  snoozeBodySchema,
  monitoringExportQuerySchema,
} from './care-reminder.schema.js'

export class CareReminderController {
  constructor(
    private readonly reminders: CareReminderService,
    private readonly measurements: MeasurementService,
  ) {}

  async list(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = careReminderQuerySchema.safeParse(req.query)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.patientId)) return
    const rows = await this.reminders.list({
      patientId: parsed.data.patientId,
      healthThreadId: parsed.data.healthThreadId,
      activeOnly: parsed.data.activeOnly ?? true,
    })
    return reply.send(rows.map((r) => r.toJSON()))
  }

  async pending(req: AuthenticatedRequest, reply: FastifyReply) {
    const patientId = (req.query as { patientId?: string }).patientId
    if (!patientId) return reply.status(400).send({ message: 'patientId obrigatório' })
    if (!assertPatientAccess(req, reply, patientId)) return
    const rows = await this.reminders.listPending(patientId)
    return reply.send(rows.map((r) => r.toJSON()))
  }

  async create(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = createCareReminderSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.patientId)) return
    const row = await this.reminders.create({
      ...parsed.data,
      nextFireAt: parsed.data.nextFireAt ?? new Date(),
    })
    return reply.status(201).send(row.toJSON())
  }

  async createIllnessPack(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = illnessPackSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.patientId)) return
    const rows = await this.reminders.createIllnessPack(parsed.data.patientId, {
      healthThreadId: parsed.data.healthThreadId,
      vitalsIntervalMinutes: parsed.data.vitalsIntervalMinutes,
      medicationName: parsed.data.medicationName,
      medicationIntervalMinutes: parsed.data.medicationIntervalMinutes,
      doseHint: parsed.data.doseHint,
    })
    return reply.status(201).send(rows.map((r) => r.toJSON()))
  }

  async complete(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = careReminderParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    try {
      const existing = await this.reminders.findById(params.data.id)
      if (!guardPatientEntity(req, reply, existing)) return
      const row = await this.reminders.complete(params.data.id)
      return reply.send(row.toJSON())
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }

  async snooze(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = careReminderParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = snoozeBodySchema.safeParse(req.body ?? {})
    const minutes = body.success ? body.data.minutes : 30
    try {
      const existing = await this.reminders.findById(params.data.id)
      if (!guardPatientEntity(req, reply, existing)) return
      const row = await this.reminders.snooze(params.data.id, minutes)
      return reply.send(row.toJSON())
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }

  async deactivate(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = careReminderParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    try {
      const existing = await this.reminders.findById(params.data.id)
      if (!guardPatientEntity(req, reply, existing)) return
      const row = await this.reminders.deactivate(params.data.id)
      return reply.send(row.toJSON())
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }

  async monitoringExport(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = monitoringExportQuerySchema.safeParse(req.query)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.patientId)) return
    const report = await this.measurements.buildMonitoringExport(parsed.data.patientId, {
      healthThreadId: parsed.data.healthThreadId,
      from: parsed.data.from,
      to: parsed.data.to,
    })
    return reply.send(report)
  }
}
