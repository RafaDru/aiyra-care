import type { FastifyReply } from 'fastify'
import { z } from 'zod'
import type { CadernetaImportService } from '../../../application/caderneta/caderneta-import.service.js'
import { NotFoundError } from '../../../domain/errors.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { assertPatientAccess } from '../auth/patient-access.guard.js'

const patientParamsSchema = z.object({ patientId: z.string().uuid() })

const importSchema = z.object({
  vaccines: z.array(z.object({
    vaccineName: z.string(),
    dose: z.string().optional(),
    applicationDate: z.string(),
    nextDoseDate: z.string().optional(),
    batch: z.string().optional(),
    appliedBy: z.string().optional(),
    clinic: z.string().optional(),
  })).optional(),
  vaccineSchedule: z.array(z.object({
    vaccineCode: z.string().optional(),
    vaccineName: z.string(),
    doseLabel: z.string().optional(),
    doseNumber: z.number().optional(),
    status: z.enum(['applied', 'pending', 'overdue', 'unknown']),
    expectedAgeMonths: z.number().optional(),
    expectedDate: z.string().optional(),
    applicationDate: z.string().optional(),
    nextDoseDate: z.string().optional(),
    batch: z.string().optional(),
    appliedBy: z.string().optional(),
    clinic: z.string().optional(),
    notes: z.string().optional(),
    externalKey: z.string().optional(),
  })).optional(),
  developmentMilestones: z.array(z.object({
    title: z.string(),
    category: z.string().optional(),
    status: z.enum(['achieved', 'pending', 'attention', 'unknown']),
    expectedAgeMonths: z.number().optional(),
    achievedDate: z.string().optional(),
    notes: z.string().optional(),
    externalKey: z.string().optional(),
  })).optional(),
  clinicalHistory: z.array(z.object({
    title: z.string(),
    date: z.string().optional(),
    description: z.string().optional(),
    category: z.string().optional(),
  })).optional(),
  patientCpf: z.string().optional(),
  patientCns: z.string().optional(),
})

const familyMemberSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  cpf: z.string().optional(),
  cns: z.string().optional(),
  birthDate: z.string().optional(),
  gender: z.string().optional(),
})

const childBundleSchema = z.object({
  member: familyMemberSchema,
  vaccines: importSchema.shape.vaccines,
  vaccineSchedule: importSchema.shape.vaccineSchedule,
  developmentMilestones: importSchema.shape.developmentMilestones,
  clinicalHistory: importSchema.shape.clinicalHistory,
})

const familyImportSchema = z.object({
  childBundles: z.array(childBundleSchema).min(1),
  responsibleCpf: z.string().optional(),
})

export class CadernetaImportController {
  constructor(private readonly service: CadernetaImportService) {}

  async import(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = patientParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    if (!assertPatientAccess(req, reply, params.data.patientId)) return
    const body = importSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const result = await this.service.importForPatient(params.data.patientId, {
        ...body.data,
        vaccines: body.data.vaccines ?? [],
        vaccineSchedule: body.data.vaccineSchedule,
        developmentMilestones: body.data.developmentMilestones,
        clinicalHistory: body.data.clinicalHistory,
      })
      return reply.send(result)
    } catch (err) {
      return err instanceof NotFoundError
        ? reply.status(404).send({ message: err.message })
        : reply.status(400).send({ message: err instanceof Error ? err.message : 'Erro na importação' })
    }
  }

  async listSchedule(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = patientParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    if (!assertPatientAccess(req, reply, params.data.patientId)) return
    const rows = await this.service.listSchedule(params.data.patientId)
    return reply.send(rows)
  }

  async listMilestones(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = patientParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    if (!assertPatientAccess(req, reply, params.data.patientId)) return
    const rows = await this.service.listMilestones(params.data.patientId)
    return reply.send(rows)
  }

  async planFamily(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = patientParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    if (!assertPatientAccess(req, reply, params.data.patientId)) return
    const body = familyImportSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const plan = await this.service.planFamilyImport(
        params.data.patientId,
        body.data.childBundles.map((b) => ({
          member: b.member,
          vaccines: b.vaccines ?? [],
          vaccineSchedule: b.vaccineSchedule ?? [],
          developmentMilestones: b.developmentMilestones ?? [],
          clinicalHistory: b.clinicalHistory ?? [],
        })),
        body.data.responsibleCpf,
      )
      return reply.send(plan)
    } catch (err) {
      return err instanceof NotFoundError
        ? reply.status(404).send({ message: err.message })
        : reply.status(400).send({ message: err instanceof Error ? err.message : 'Erro no planejamento' })
    }
  }

  async importFamily(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = patientParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    if (!assertPatientAccess(req, reply, params.data.patientId)) return
    const body = familyImportSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const bundles = body.data.childBundles.map((b) => ({
        member: b.member,
        vaccines: b.vaccines ?? [],
        vaccineSchedule: b.vaccineSchedule ?? [],
        developmentMilestones: b.developmentMilestones ?? [],
        clinicalHistory: b.clinicalHistory ?? [],
      }))
      const result = await this.service.importFamilyForAnchor(
        params.data.patientId,
        bundles,
        body.data.responsibleCpf,
      )
      return reply.send(result)
    } catch (err) {
      return err instanceof NotFoundError
        ? reply.status(404).send({ message: err.message })
        : reply.status(400).send({ message: err instanceof Error ? err.message : 'Erro na importação' })
    }
  }
}
