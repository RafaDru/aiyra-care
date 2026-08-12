import type { FastifyReply } from 'fastify'
import type { PatientService } from '../../../application/patient/patient.service.js'
import type { PatientContextService } from '../../../application/patient/patient-context.service.js'
import type { PatientMembershipRepository } from '../../../domain/auth/app-account.repository.js'
import {
  createPatientSchema,
  updatePatientSchema,
  patientParamsSchema,
  patientContextQuerySchema,
  patientTimelineQuerySchema,
} from './patient.schema.js'
import { NotFoundError } from '../../../domain/errors.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import {
  assertPatientAccess,
  getAllowedPatientIds,
  isAuthEnforcementEnabled,
} from '../auth/patient-access.guard.js'
import { subscribePatientSyncCompletions } from '../../sync/sync-completion.bus.js'

const PATIENT_SYNC_STREAM_HEARTBEAT_MS = 25_000

export class PatientController {
  constructor(
    private readonly service: PatientService,
    private readonly memberships?: PatientMembershipRepository,
    private readonly contextService?: PatientContextService,
  ) {}

  async create(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = createPatientSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const patient = await this.service.create(parsed.data)
    if (req.accountId && this.memberships) {
      await this.memberships.ensureMembership(req.accountId, patient.id, 'guardian')
    }
    return reply.status(201).send(patient.toJSON())
  }

  async getContext(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = patientParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.id)) return
    if (!this.contextService) {
      return reply.status(503).send({ message: 'Patient context service unavailable' })
    }
    const query = patientContextQuerySchema.safeParse(req.query)
    if (!query.success) return reply.status(400).send({ error: query.error.flatten() })
    try {
      const context = await this.contextService.build(parsed.data.id, {
        timelineMonths: query.data.timelineMonths,
      })
      return reply.send(context)
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }

  async getTimeline(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = patientParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.id)) return
    if (!this.contextService) {
      return reply.status(503).send({ message: 'Patient context service unavailable' })
    }
    const query = patientTimelineQuerySchema.safeParse(req.query)
    if (!query.success) return reply.status(400).send({ error: query.error.flatten() })
    try {
      const timeline = await this.contextService.buildTimeline(parsed.data.id, {
        timelineMonths: query.data.timelineMonths,
        kinds: query.data.kinds,
        sources: query.data.sources,
        from: query.data.from,
        to: query.data.to,
        limit: query.data.limit,
        offset: query.data.offset,
      })
      return reply.send(timeline)
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }

  async streamSyncCompletions(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = patientParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.id)) return

    const patientId = parsed.data.id
    const res = reply.raw
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    res.write('\n')

    const writeEvent = (event: string, payload: unknown) => {
      res.write(`event: ${event}\n`)
      res.write(`data: ${JSON.stringify(payload)}\n\n`)
    }

    const unsub = subscribePatientSyncCompletions(patientId, (event) => {
      writeEvent(event.status === 'success' ? 'completed' : 'failed', event)
    })

    const heartbeat = setInterval(() => {
      writeEvent('heartbeat', { ts: new Date().toISOString() })
    }, PATIENT_SYNC_STREAM_HEARTBEAT_MS)

    req.raw.on('close', () => {
      clearInterval(heartbeat)
      unsub()
    })
  }

  async findById(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = patientParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.id)) return
    try {
      const patient = await this.service.findById(parsed.data.id)
      return reply.send(patient.toJSON())
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }

  async findAll(req: AuthenticatedRequest, reply: FastifyReply) {
    if (isAuthEnforcementEnabled()) {
      const ids = [...getAllowedPatientIds(req)]
      const patients = await this.service.findByIds(ids)
      return reply.send(patients.map((p) => p.toJSON()))
    }
    const patients = await this.service.findAll()
    return reply.send(patients.map((p) => p.toJSON()))
  }

  async update(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = patientParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    if (!assertPatientAccess(req, reply, params.data.id)) return
    const body = updatePatientSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const patient = await this.service.update(params.data.id, body.data)
      return reply.send(patient.toJSON())
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }

  async delete(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = patientParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.id)) return
    try {
      await this.service.delete(parsed.data.id)
      return reply.status(204).send()
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }
}
