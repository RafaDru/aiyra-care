import type { FastifyReply } from 'fastify'
import type { ScheduledEventService } from '../../../application/scheduled-event/scheduled-event.service.js'
import {
  createScheduledEventSchema,
  updateScheduledEventSchema,
  scheduledEventParamsSchema,
  scheduledEventQuerySchema,
  importIcsSchema,
} from './scheduled-event.schema.js'
import { NotFoundError } from '../../../domain/errors.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { assertPatientAccess, filterByPatientAccess } from '../auth/patient-access.guard.js'
import { guardPatientEntity } from '../auth/patient-entity.guard.js'

export class ScheduledEventController {
  constructor(private readonly service: ScheduledEventService) {}

  async create(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = createScheduledEventSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.patientId)) return
    const event = await this.service.create({
      ...parsed.data,
      healthThreadId: parsed.data.healthThreadId ?? undefined,
      description: parsed.data.description ?? undefined,
      endAt: parsed.data.endAt ?? undefined,
    })
    return reply.status(201).send(event.toJSON())
  }

  async findById(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = scheduledEventParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try {
      const event = await this.service.findById(parsed.data.id)
      if (!guardPatientEntity(req, reply, event)) return
      return reply.send(event.toJSON())
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }

  async findAll(req: AuthenticatedRequest, reply: FastifyReply) {
    const query = scheduledEventQuerySchema.safeParse(req.query)
    const filter = query.success ? query.data : undefined
    if (filter?.patientId && !assertPatientAccess(req, reply, filter.patientId)) return
    const events = await this.service.findAll(filter)
    return reply.send(
      filterByPatientAccess(req, events, (e) => e.patientId).map((e) => e.toJSON()),
    )
  }

  async update(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = scheduledEventParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = updateScheduledEventSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const existing = await this.service.findById(params.data.id)
      if (!guardPatientEntity(req, reply, existing)) return
      const event = await this.service.update(params.data.id, body.data)
      return reply.send(event.toJSON())
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }

  async delete(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = scheduledEventParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try {
      const existing = await this.service.findById(parsed.data.id)
      if (!guardPatientEntity(req, reply, existing)) return
      await this.service.delete(parsed.data.id)
      return reply.status(204).send()
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }

  async importIcs(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = importIcsSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.patientId)) return
    const result = await this.service.importIcs(
      parsed.data.patientId,
      parsed.data.ics,
      parsed.data.sourceLabel,
    )
    return reply.send(result)
  }

  async exportIcs(req: AuthenticatedRequest, reply: FastifyReply) {
    const patientId = (req.query as { patientId?: string }).patientId
    if (!patientId) return reply.status(400).send({ message: 'patientId obrigatório' })
    if (!assertPatientAccess(req, reply, patientId)) return
    const events = await this.service.findAll({ patientId })
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//AiyraCare//Agenda//PT',
      'CALSCALE:GREGORIAN',
    ]
    for (const e of events) {
      const start = new Date(e.scheduledAt).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
      const end = e.endAt
        ? new Date(e.endAt).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
        : start
      lines.push('BEGIN:VEVENT')
      const uid = e.externalUid ?? `${e.id}@aiyracare`
      lines.push(`UID:${uid}`)
      lines.push(`DTSTART:${start}`)
      lines.push(`DTEND:${end}`)
      lines.push(`SUMMARY:${e.title.replace(/\n/g, ' ')}`)
      if (e.description) lines.push(`DESCRIPTION:${e.description.replace(/\n/g, ' ')}`)
      lines.push('END:VEVENT')
    }
    lines.push('END:VCALENDAR')
    const body = lines.join('\r\n')
    return reply
      .header('Content-Type', 'text/calendar; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="agenda-${patientId}.ics"`)
      .send(body)
  }
}
