import type { FastifyRequest, FastifyReply } from 'fastify'
import type { Pool } from 'pg'
import type { IntegrationLinkRepository } from '../../../domain/integration-link/integration-link.repository.js'
import { IntegrationLink } from '../../../domain/integration-link/integration-link.entity.js'
import { createIntegrationLinkSchema, updateIntegrationLinkSchema, integrationLinkParamsSchema, integrationLinkQuerySchema } from './integration-link.schema.js'
import { UnimedBhSyncScraper } from '../../scraper/unimedbh-sync.scraper.js'
import { Authorization } from '../../../domain/authorization/authorization.entity.js'
import { AuthorizationItem } from '../../../domain/authorization/authorization-item.entity.js'
import { AuthorizationPgRepository } from '../../persistence/authorization.pg.repository.js'
import { Exam } from '../../../domain/exam/exam.entity.js'
import { MedicalRecord } from '../../../domain/medical-record/medical-record.entity.js'
import { ExamPgRepository } from '../../persistence/exam.pg.repository.js'
import { MedicalRecordPgRepository } from '../../persistence/medical-record.pg.repository.js'
import { createJob, updateJob, getJob, removeJob, type SyncAuthorizationDetail } from '../../scraper/sync-progress-store.js'
import { encrypt, decrypt } from '../../crypto-helper.js'

const syncLocks = new Set<string>()

export class IntegrationLinkController {
  constructor(
    private readonly repo: IntegrationLinkRepository,
    private readonly pool: Pool,
  ) {}

  async create(req: FastifyRequest, reply: FastifyReply) {
    const parsed = createIntegrationLinkSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const { password, ...rest } = parsed.data
    const encryptedPassword = password ? encrypt(password) : undefined
    const link = IntegrationLink.create({ ...rest, encryptedPassword })
    const saved = await this.repo.save(link)
    return reply.status(201).send({ ...saved.toJSON(), encryptedPassword: undefined })
  }

  async findByPatient(req: FastifyRequest, reply: FastifyReply) {
    const query = integrationLinkQuerySchema.safeParse(req.query)
    if (!query.success) return reply.status(400).send({ error: query.error.flatten() })
    const links = await this.repo.findAllByPatient(query.data.patientId)
    return reply.send(links.map(l => ({ ...l.toJSON(), encryptedPassword: undefined })))
  }

  async update(req: FastifyRequest, reply: FastifyReply) {
    const params = integrationLinkParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = updateIntegrationLinkSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const existing = await this.repo.findById(params.data.id)
    if (!existing) return reply.status(404).send({ message: 'Integration link not found' })
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

  async delete(req: FastifyRequest, reply: FastifyReply) {
    const parsed = integrationLinkParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const existing = await this.repo.findById(parsed.data.id)
    if (!existing) return reply.status(404).send({ message: 'Integration link not found' })
    await this.repo.delete(parsed.data.id)
    return reply.status(204).send()
  }

  async sync(req: FastifyRequest, reply: FastifyReply) {
    const params = integrationLinkParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const link = await this.repo.findById(params.data.id)
    if (!link) return reply.status(404).send({ message: 'Integration link not found' })
    if (!link.email || !link.encryptedPassword) return reply.status(400).send({ message: 'Credenciais incompletas' })
    const decryptedPassword = decrypt(link.encryptedPassword)

    const lockKey = `${link.patientId}:${link.portalType}`
    if (syncLocks.has(lockKey)) return reply.status(429).send({ message: 'Sincronização já em andamento' })
    syncLocks.add(lockKey)

    const jobId = createJob()
    const emit = (step: string, message: string, status: 'running' | 'success' | 'failed') => {
      updateJob(jobId, { step, message, status })
    }

    setImmediate(async () => {
      try {
        const scraper = new UnimedBhSyncScraper()
        const result = await scraper.scrape(link.email!, decryptedPassword, (p) => updateJob(jobId, p))

        emit('importing', 'Salvando dados...', 'running')

        const examRepo = new ExamPgRepository(this.pool)
        const recordRepo = new MedicalRecordPgRepository(this.pool)
        const authRepo = new AuthorizationPgRepository(this.pool)
        let importedExams = 0
        let importedRecords = 0
        let importedAuths = 0
        let updatedAuths = 0
        let importedItems = 0
        const authorizationDetails: SyncAuthorizationDetail[] = []

        const allItems = [...result.extrato.paciente]
        for (const depItems of Object.values(result.extrato.dependentes)) {
          allItems.push(...depItems)
        }

        const existingExams = await examRepo.findAll({ patientId: link.patientId })
        const existingAuths = await authRepo.findAll({ patientId: link.patientId })
        const existingRecords = await recordRepo.findAll({ patientId: link.patientId })

        const examKey = (e: typeof existingExams[0]) => `${e.examType}|${e.examDate.toISOString().slice(0, 10)}`
        const existingExamKeys = new Set(existingExams.map(examKey))
        const recordKey = (r: typeof existingRecords[0]) => {
          const date = r.recordDate.toISOString().slice(0, 10)
          if (r.invoiceNumber) return `inv:${r.invoiceNumber}`
          if (r.providerExternalId) return `prov:${r.providerExternalId}|${date}|${r.description || ''}`
          return `${date}|${normalizeName(r.doctorName)}|${r.description || ''}`
        }
        const existingRecordKeys = new Set(existingRecords.map(recordKey))
        const savedConsultas: typeof existingRecords = [...existingRecords]

        const authBySolicitation = new Map(
          existingAuths
            .filter(a => a.solicitationNumber)
            .map(a => [a.solicitationNumber!, a]),
        )
        const authByLegacy = new Map(
          existingAuths.map(a => [`${a.procedureCode || ''}|${a.guideNumber || ''}`, a]),
        )

        for (const item of allItems) {
          const parsedDate = parseDate(item.procedureDate)
          if (!parsedDate) continue

          if (item.kind === 'consulta' || (item.kind === 'outro' && item.doctorName)) {
            const draft = MedicalRecord.create({
              patientId: link.patientId,
              recordDate: parsedDate,
              recordType: item.kind === 'consulta' ? 'consulta' : 'outro',
              doctorName: item.doctorName || undefined,
              clinicName: 'Unimed BH',
              description: item.procedureDescription || undefined,
              notes: [
                item.value ? `Valor: ${item.value}` : null,
                item.invoiceNumber ? `Nota: ${item.invoiceNumber}` : null,
                item.copartCompanyAmount != null ? `Copart empresa: ${item.copartCompanyAmount}` : null,
                item.copartBaseAmount != null ? `Base copart: ${item.copartBaseAmount}` : null,
              ].filter(Boolean).join(' | ') || undefined,
              source: 'unimed',
              invoiceNumber: item.invoiceNumber || undefined,
              chargedAmount: item.chargedAmount,
              copartCompanyAmount: item.copartCompanyAmount,
              copartBaseAmount: item.copartBaseAmount,
              providerExternalId: item.providerExternalId,
              procedureExternalId: item.procedureExternalId,
            })
            const key = recordKey(draft)
            if (!existingRecordKeys.has(key)) {
              const saved = await recordRepo.save(draft)
              importedRecords++
              existingRecordKeys.add(key)
              savedConsultas.push(saved)
            }
          }

          if (item.kind === 'exame' && item.procedureDescription) {
            const key = `${item.procedureDescription}|${parsedDate.toISOString().slice(0, 10)}`
            if (!existingExamKeys.has(key)) {
              await examRepo.save(Exam.create({
                patientId: link.patientId,
                examType: item.procedureDescription,
                examDate: parsedDate,
                laboratory: item.doctorName || undefined,
                notes: [
                  item.value ? `Valor: ${item.value}` : null,
                  item.invoiceNumber ? `Nota: ${item.invoiceNumber}` : null,
                ].filter(Boolean).join(' | ') || undefined,
                source: 'unimed',
              }))
              importedExams++
              existingExamKeys.add(key)
            }
          }
        }

        const allAuths = [...result.autorizacoes.paciente]
        for (const depItems of Object.values(result.autorizacoes.dependentes)) {
          allAuths.push(...depItems)
        }

        for (const item of allAuths) {
          const solicitationNumber = item.solicitationNumber || item.guideNumber || ''
          const legacyKey = `${item.procedureCode || ''}|${item.guideNumber || ''}`
          const existing = (solicitationNumber && authBySolicitation.get(solicitationNumber))
            || (legacyKey !== '|' ? authByLegacy.get(legacyKey) : undefined)

          const authDate = parseDate(item.authorizationDate)
          const linkedConsulta = findOriginatingConsulta(savedConsultas, {
            providerExternalId: item.providerExternalId,
            doctorName: item.doctorName,
            authorizationDate: authDate,
          })

          const props = {
            patientId: link.patientId,
            procedureCode: item.procedureCode || undefined,
            procedureDescription: item.procedureDescription || item.classification || undefined,
            doctorName: item.doctorName || undefined,
            doctorCouncil: item.doctorCouncil || undefined,
            clinicName: item.clinicName || item.localAddress || undefined,
            authorizationDate: authDate ?? undefined,
            validityDate: parseDate(item.validityDate) ?? undefined,
            status: item.status || 'authorized',
            guideNumber: item.guideNumber || solicitationNumber || undefined,
            quantity: item.items?.length || (item.quantity ? Number(item.quantity) : undefined),
            source: 'unimed',
            solicitationNumber: solicitationNumber || undefined,
            guidePassword: item.guidePassword || undefined,
            specialty: item.specialty || undefined,
            solicitationUrl: item.solicitationUrl || undefined,
            solicId: item.solicId || undefined,
            solicIdEncrypted: item.solicIdEncrypted || undefined,
            authorizationType: item.authorizationType || undefined,
            classification: item.classification || undefined,
            localAddress: item.localAddress || undefined,
            localPhone: item.localPhone || undefined,
            locations: item.locations,
            history: item.history,
            medicalRecordId: linkedConsulta?.id,
            providerExternalId: item.providerExternalId,
          }

          let saved: Authorization
          let action: 'created' | 'updated'
          if (existing) {
            saved = await authRepo.update(Authorization.restore({
              ...existing.toJSON(),
              ...Authorization.create(props, existing.id).toJSON(),
              id: existing.id,
              createdAt: existing.createdAt,
              items: existing.items,
              medicalRecordId: linkedConsulta?.id ?? existing.medicalRecordId,
            }))
            updatedAuths++
            action = 'updated'
          } else {
            saved = await authRepo.save(Authorization.create(props))
            importedAuths++
            action = 'created'
            if (solicitationNumber) authBySolicitation.set(solicitationNumber, saved)
          }

          const childItems = (item.items ?? []).map((proc, idx) =>
            AuthorizationItem.create({
              authorizationId: saved.id,
              procedureCode: proc.procedureCode,
              procedureDescription: proc.procedureDescription,
              quantityRequested: proc.quantityRequested,
              quantityAuthorized: proc.quantityAuthorized,
              status: proc.status,
              externalProcedureId: proc.externalProcedureId,
              sortOrder: idx,
            }),
          )
          if (childItems.length) {
            await authRepo.replaceItems(saved.id, childItems)
            importedItems += childItems.length
          }

          authorizationDetails.push({
            solicitationNumber: solicitationNumber || undefined,
            classification: item.classification || item.procedureDescription || undefined,
            doctorName: item.doctorName || undefined,
            itemCount: childItems.length,
            action,
            linkedConsultaId: linkedConsulta?.id,
            linkedConsultaDate: linkedConsulta?.recordDate?.toISOString().slice(0, 10),
          })
        }

        link.markSynced()
        await this.repo.update(link)

        updateJob(jobId, { step: 'done', message: 'Sincronização concluída', status: 'success' }, {
          exams: importedExams,
          medicalRecords: importedRecords,
          authorizations: importedAuths,
          authorizationItems: importedItems,
          updatedAuthorizations: updatedAuths,
          total: importedExams + importedRecords + importedAuths + updatedAuths,
          authorizationDetails,
        })
        setTimeout(() => removeJob(jobId), 120000)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro na sincronização'
        req.log.error(err, 'Sync failed')
        updateJob(jobId, { step: 'error', message, status: 'failed' })
        setTimeout(() => removeJob(jobId), 120000)
      } finally {
        syncLocks.delete(lockKey)
      }
    })

    return reply.send({ jobId })
  }

  async syncProgress(req: FastifyRequest, reply: FastifyReply) {
    const { jobId } = req.params as { jobId: string }
    const job = getJob(jobId)
    if (!job) return reply.status(404).send({ message: 'Job not found' })
    return reply.send({ ...job.progress, result: job.result })
  }
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null
  const parts = dateStr.split('/')
  if (parts.length === 3) {
    const d = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T12:00:00`)
    if (!isNaN(d.getTime())) return d
  }
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? null : d
}

function normalizeName(name: string | null | undefined): string {
  return (name || '').normalize('NFD').replace(/\p{M}/gu, '').toUpperCase().replace(/\s+/g, ' ').trim()
}

function findOriginatingConsulta(
  records: Array<{
    id: string
    recordDate: Date
    recordType: string
    doctorName: string | null
    providerExternalId: string | null
    description: string | null
  }>,
  auth: { providerExternalId?: string; doctorName?: string; authorizationDate: Date | null },
) {
  const consultas = records.filter((r) => r.recordType === 'consulta')
  if (!consultas.length || !auth.authorizationDate) return undefined

  const authDay = auth.authorizationDate.toISOString().slice(0, 10)
  const byProvider = auth.providerExternalId
    ? consultas.find((r) =>
      r.providerExternalId === auth.providerExternalId
      && r.recordDate.toISOString().slice(0, 10) === authDay)
    : undefined
  if (byProvider) return byProvider

  const doctor = normalizeName(auth.doctorName)
  if (!doctor) return undefined
  return consultas.find((r) =>
    r.recordDate.toISOString().slice(0, 10) === authDay
    && normalizeName(r.doctorName) === doctor)
}
