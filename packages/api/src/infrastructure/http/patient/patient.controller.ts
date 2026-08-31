import type { FastifyReply } from 'fastify'
import type { PatientService } from '../../../application/patient/patient.service.js'
import type { PatientContextService } from '../../../application/patient/patient-context.service.js'
import type { LegalComplianceService } from '../../../application/legal-compliance/legal-compliance.service.js'
import type { DataGenerationService } from '../../../application/data-generation/data-generation.service.js'
import type { PatientMembershipRepository } from '../../../domain/auth/app-account.repository.js'
import { isMinorBirthDate } from '../../../domain/patient/patient-age.js'

function enrichPatientJson(
  patient: { toJSON: () => Record<string, unknown> },
  roleMap: Record<string, string>,
) {
  const json = patient.toJSON() as Record<string, unknown>
  const id = String(json.id)
  const membershipRole = roleMap[id] ?? 'guardian'
  return {
    ...json,
    membershipRole,
    isSelf: membershipRole === 'self',
  }
}
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
import {
  getCachedPatientContext,
  setCachedPatientContext,
} from '../../cache/patient-context.cache.js'

const PATIENT_SYNC_STREAM_HEARTBEAT_MS = 25_000

export class PatientController {
  constructor(
    private readonly service: PatientService,
    private readonly memberships?: PatientMembershipRepository,
    private readonly contextService?: PatientContextService,
    private readonly compliance?: LegalComplianceService,
    private readonly dataGen?: DataGenerationService,
  ) {}

  async create(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = createPatientSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (req.accountId && isMinorBirthDate(parsed.data.birthDate) && this.compliance) {
      try {
        await this.compliance.assertMinorGuardianConsent(req.accountId)
      } catch (err) {
        const code = err && typeof err === 'object' && 'code' in err
          ? String((err as { code?: string }).code)
          : undefined
        if (code === 'MINOR_GUARDIAN_CONSENT_REQUIRED') {
          return reply.status(403).send({
            message: err instanceof Error ? err.message : 'Consentimento pendente',
            code: 'MINOR_GUARDIAN_CONSENT_REQUIRED',
          })
        }
        throw err
      }
    }
    const patient = await this.service.create(parsed.data)
    if (req.accountId && this.memberships) {
      const wantsSelf = Boolean(parsed.data.markAsSelf) && !isMinorBirthDate(parsed.data.birthDate)
      if (wantsSelf) {
        await this.memberships.setSelfPatient(req.accountId, patient.id)
      } else {
        await this.memberships.ensureMembership(req.accountId, patient.id, 'guardian')
      }
    }
    const roleMap =
      req.accountId && this.memberships
        ? await this.memberships.listRolesForAccount(req.accountId)
        : {}
    return reply.status(201).send(enrichPatientJson(patient, roleMap))
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
      const timelineMonths = query.data.timelineMonths
      const patientId = parsed.data.id
      const accountId = req.accountId!
      const generation =
        (await this.dataGen?.getPatientGeneration(accountId, patientId, 'timeline'))
        ?? new Date(0).toISOString()
      const etag = `"${generation}"`
      const ifNoneMatch = req.headers['if-none-match']
      if (ifNoneMatch === etag) {
        return reply.header('ETag', etag).status(304).send()
      }
      const cached = getCachedPatientContext(patientId, generation, timelineMonths)
      if (cached) {
        return reply.header('ETag', etag).send(cached)
      }
      const context = await this.contextService.build(patientId, {
        timelineMonths,
      })
      setCachedPatientContext(patientId, generation, timelineMonths, context)
      return reply.header('ETag', etag).send(context)
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
      const roleMap =
        req.accountId && this.memberships
          ? await this.memberships.listRolesForAccount(req.accountId)
          : {}
      return reply.send(enrichPatientJson(patient, roleMap))
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }

  async findAll(req: AuthenticatedRequest, reply: FastifyReply) {
    const roleMap =
      req.accountId && this.memberships
        ? await this.memberships.listRolesForAccount(req.accountId)
        : {}
    if (isAuthEnforcementEnabled()) {
      const ids = [...getAllowedPatientIds(req)]
      const patients = await this.service.findByIds(ids)
      return reply.send(patients.map((p) => enrichPatientJson(p, roleMap)))
    }
    const patients = await this.service.findAll()
    return reply.send(patients.map((p) => enrichPatientJson(p, roleMap)))
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
