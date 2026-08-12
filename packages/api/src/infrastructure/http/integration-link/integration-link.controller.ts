import type { FastifyReply } from 'fastify'
import type { Pool } from 'pg'
import type { IntegrationLinkRepository } from '../../../domain/integration-link/integration-link.repository.js'
import { IntegrationLink } from '../../../domain/integration-link/integration-link.entity.js'
import { createIntegrationLinkSchema, updateIntegrationLinkSchema, integrationLinkParamsSchema, integrationLinkQuerySchema, syncLinkQuerySchema } from './integration-link.schema.js'
import { UnimedBhCartaoVirtualScraper } from '../../scraper/unimedbh-cartao-virtual.scraper.js'
import { entityToSyncProgressPayload, type SyncProgressPayload } from '../../scraper/sync-progress-store.js'
import { subscribeSyncJob } from '../../scraper/sync-job-stream.js'
import { SyncJobPgRepository } from '../../persistence/sync-job.pg.repository.js'
import { decrypt, encrypt } from '../../crypto-helper.js'
import { PatientPgRepository } from '../../persistence/patient.pg.repository.js'
import { InsurancePlanService } from '../../../application/insurance-plan/insurance-plan.service.js'
import { InsurancePlanPgRepository } from '../../persistence/insurance-plan.pg.repository.js'
import { PlanMembershipPgRepository } from '../../persistence/plan-membership.pg.repository.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { assertPatientAccess } from '../auth/patient-access.guard.js'
import { guardPatientEntity } from '../auth/patient-entity.guard.js'
import { enrichIntegrationLinksWithSyncAuthority } from '../../../application/integration-link/integration-link-sync-authority.js'
import { IntegrationLinkSyncService } from '../../../application/integration-link/integration-link-sync.service.js'
import { isIntegrationLinkSessionReady } from '../../../application/integration-link/integration-link-session.js'

const syncLocks = new Set<string>()

const SYNC_STREAM_HEARTBEAT_MS = Number(process.env.SYNC_STREAM_HEARTBEAT_MS ?? '25000')

function syncJobToStatusPayload(job: ReturnType<SyncJobPgRepository['findById']> extends Promise<infer T> ? NonNullable<T> : never) {
  const d = job.toJSON()
  return {
    id: d.id,
    status: d.status,
    step: d.step,
    message: d.message,
    stepDetails: d.stepDetails,
    result: d.result,
    novelty: d.novelty,
    error: d.error,
    startedAt: d.startedAt.toISOString(),
    finishedAt: d.finishedAt?.toISOString() ?? null,
    portalType: d.portalType,
  }
}

export class IntegrationLinkController {
  private readonly syncJobRepo: SyncJobPgRepository
  private readonly syncService: IntegrationLinkSyncService

  constructor(
    private readonly repo: IntegrationLinkRepository,
    private readonly pool: Pool,
  ) {
    this.syncService = new IntegrationLinkSyncService(pool, repo)
    this.syncJobRepo = this.syncService.getSyncJobRepository()
  }

  async create(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = createIntegrationLinkSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.patientId)) return
    const { password, ...rest } = parsed.data
    const encryptedPassword = password ? encrypt(password) : undefined
    const link = IntegrationLink.create({ ...rest, encryptedPassword })
    const saved = await this.repo.save(link)
    return reply.status(201).send({ ...saved.toJSON(), encryptedPassword: undefined })
  }

  async findByPatient(req: AuthenticatedRequest, reply: FastifyReply) {
    const query = integrationLinkQuerySchema.safeParse(req.query)
    if (!query.success) return reply.status(400).send({ error: query.error.flatten() })
    if (!assertPatientAccess(req, reply, query.data.patientId)) return
    const links = await this.repo.findAllByPatient(query.data.patientId)
    const enriched = await enrichIntegrationLinksWithSyncAuthority(this.pool, query.data.patientId, links)
    return reply.send(enriched.map((l) => ({
      ...l,
      encryptedPassword: undefined,
      sessionExpiresAt: l.sessionExpiresAt?.toISOString() ?? null,
      effectiveSessionExpiresAt: l.effectiveSessionExpiresAt?.toISOString() ?? null,
      lastSyncAt: l.lastSyncAt?.toISOString() ?? null,
      effectiveLastSyncAt: l.effectiveLastSyncAt?.toISOString() ?? null,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    })))
  }

  async update(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = integrationLinkParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = updateIntegrationLinkSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const existing = await guardPatientEntity(
      req,
      reply,
      await this.repo.findById(params.data.id),
      'Integration link not found',
    )
    if (!existing) return
    const data = existing.toJSON()
    const updated = IntegrationLink.restore({
      ...data,
      email: body.data.email ?? data.email,
      encryptedPassword: body.data.password ? encrypt(body.data.password) : data.encryptedPassword,
      cardNumber: body.data.cardNumber ?? data.cardNumber,
      active: body.data.active ?? data.active,
      updatedAt: new Date(),
    })
    const saved = await this.repo.update(updated)
    return reply.send({ ...saved.toJSON(), encryptedPassword: undefined })
  }

  async delete(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = integrationLinkParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const existing = await guardPatientEntity(
      req,
      reply,
      await this.repo.findById(parsed.data.id),
      'Integration link not found',
    )
    if (!existing) return
    await this.repo.delete(parsed.data.id)
    return reply.status(204).send()
  }

  async sync(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = integrationLinkParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const query = syncLinkQuerySchema.safeParse(req.query)
    if (!query.success) return reply.status(400).send({ error: query.error.flatten() })
    const silent = query.data.silent ?? false
    const force = query.data.force ?? false

    const link = await guardPatientEntity(
      req,
      reply,
      await this.repo.findById(params.data.id),
      'Integration link not found',
    )
    if (!link) return

    const result = await this.syncService.requestSync(link, {
      silent,
      force,
      trigger: 'manual',
      background: true,
      log: req.log,
    })

    if (result.skipped && result.reason === 'unsupported_portal') {
      return reply.status(400).send({ message: `Sincronização automática ainda não disponível para ${link.portalType}` })
    }
    if (result.skipped && result.reason === 'missing_credentials') {
      return reply.status(400).send({ message: 'Credenciais incompletas' })
    }
    if (result.skipped && (result.reason === 'active_job' || result.reason === 'lock')) {
      return reply.status(429).send({ message: 'Sincronização já em andamento' })
    }
    if (result.skipped) {
      return reply.send({
        jobId: result.jobId,
        skipped: true,
        reason: result.reason,
        silent,
      })
    }

    return reply.send({ jobId: result.jobId, silent })
  }


  async virtualCard(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = integrationLinkParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const link = await guardPatientEntity(
      req,
      reply,
      await this.repo.findById(params.data.id),
      'Integration link not found',
    )
    if (!link) return
    if (link.portalType !== 'unimed') {
      return reply.status(400).send({ message: 'QR Code / token disponível apenas para Unimed BH' })
    }
    if (!link.email || !link.encryptedPassword) {
      return reply.status(400).send({ message: 'Credenciais incompletas' })
    }

    const lockKey = `virtual-card:${link.patientId}:${link.portalType}`
    if (syncLocks.has(lockKey)) return reply.status(429).send({ message: 'Geração de token já em andamento' })
    syncLocks.add(lockKey)

    try {
      const patientRepo = new PatientPgRepository(this.pool)
      const patient = await patientRepo.findById(link.patientId)
      const storedUnimedState =
        link.encryptedSessionToken && isIntegrationLinkSessionReady(link)
          ? decrypt(link.encryptedSessionToken)
          : undefined
      const scraper = new UnimedBhCartaoVirtualScraper()
      const card = await scraper.scrape(link.email, decrypt(link.encryptedPassword), {
        patientName: patient?.name,
        cardNumber: link.cardNumber || undefined,
        storageStateJson: storedUnimedState,
      })

      if (card.cardNumber && card.cardNumber !== link.cardNumber) {
        link.setCardNumber(card.cardNumber)
        await this.repo.update(link)
      }

      const planService = new InsurancePlanService(
        new InsurancePlanPgRepository(this.pool),
        new PlanMembershipPgRepository(this.pool),
      )
      const planResult = await planService.upsertFromPortal(link.patientId, {
        operator: 'unimed',
        operatorName: card.operatorName || 'Unimed BH',
        planName: card.planName || 'Plano Unimed BH',
        productCode: card.productCode || undefined,
        networkName: card.networkName || undefined,
        segmentation: card.segmentation || undefined,
        accommodation: card.accommodation || undefined,
        geographicCoverage: card.geographicCoverage || undefined,
        regulationType: card.regulationType || undefined,
        contractType: card.contractType || undefined,
        contractorName: card.contractorName || undefined,
        addOns: card.addOns,
        externalKey: card.externalKey,
        source: 'unimed',
        raw: card.raw,
        memberNumber: card.cardNumber || undefined,
        role: 'holder',
        status: 'active',
        cns: card.cns || undefined,
        inclusionDate: card.inclusionDate ? new Date(card.inclusionDate) : null,
        cardValidFrom: card.cardValidFrom ? new Date(card.cardValidFrom) : null,
        cardValidTo: card.cardValidTo ? new Date(card.cardValidTo) : null,
      }, link.id)

      return reply.send({ ...card, plan: planResult.plan, membership: planResult.membership })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar QR Code / token Unimed'
      req.log.error(err, 'Virtual card failed')
      return reply.status(502).send({ message })
    } finally {
      syncLocks.delete(lockKey)
    }
  }

  async syncProgress(req: AuthenticatedRequest, reply: FastifyReply) {
    const { jobId } = req.params as { jobId: string }
    const dbJob = await this.syncJobRepo.findById(jobId)
    if (!dbJob) return reply.status(404).send({ message: 'Job not found' })

    const guarded = await guardPatientEntity(
      req,
      reply,
      await this.repo.findById(dbJob.integrationLinkId),
      'Integration link not found',
    )
    if (!guarded) return

    return reply.send(entityToSyncProgressPayload(dbJob, 'snapshot'))
  }

  async syncProgressStream(req: AuthenticatedRequest, reply: FastifyReply) {
    const { jobId } = req.params as { jobId: string }
    const dbJob = await this.syncJobRepo.findById(jobId)
    if (!dbJob) return reply.status(404).send({ message: 'Job not found' })

    const guarded = await guardPatientEntity(
      req,
      reply,
      await this.repo.findById(dbJob.integrationLinkId),
      'Integration link not found',
    )
    if (!guarded) return

    const res = reply.raw
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    res.write('\n')

    const writeEvent = (event: string, payload: SyncProgressPayload) => {
      res.write(`event: ${event}\n`)
      res.write(`data: ${JSON.stringify(payload)}\n\n`)
    }

    writeEvent('snapshot', entityToSyncProgressPayload(dbJob, 'snapshot'))

    const unsub = subscribeSyncJob(jobId, (payload) => {
      writeEvent(payload.event ?? 'progress', payload)
    })

    const heartbeat = setInterval(() => {
      void this.syncJobRepo.findById(jobId).then((live) => {
        if (!live) return
        const payload = entityToSyncProgressPayload(live, 'heartbeat')
        writeEvent('heartbeat', {
          step: payload.step,
          message: payload.message,
          status: payload.status,
          portalType: payload.portalType,
          event: 'heartbeat',
        })
      }).catch(() => {})
    }, SYNC_STREAM_HEARTBEAT_MS)

    req.raw.on('close', () => {
      clearInterval(heartbeat)
      unsub()
    })
  }

  async syncStatus(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = integrationLinkParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const link = await guardPatientEntity(
      req,
      reply,
      await this.repo.findById(params.data.id),
      'Integration link not found',
    )
    if (!link) return

    const active = await this.syncJobRepo.findActiveByLinkId(link.id)
    const last = await this.syncJobRepo.findLastCompletedByLinkId(link.id)

    return reply.send({
      activeJob: active ? syncJobToStatusPayload(active) : null,
      lastJob: last ? syncJobToStatusPayload(last) : null,
    })
  }
}
