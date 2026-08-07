import type { FastifyReply } from 'fastify'
import type { HealthThreadService } from '../../../application/health-thread/health-thread.service.js'
import type { HealthThreadWorkflowService } from '../../../application/health-thread/health-thread-workflow.service.js'
import {
  createHealthThreadSchema,
  updateHealthThreadSchema,
  healthThreadParamsSchema,
  healthThreadQuerySchema,
  closeHealthThreadSchema,
  investigationWizardSchema,
  taskWizardSchema,
  addThreadEntrySchema,
  linkArtifactSchema,
  createExamFromThreadSchema,
  createMedicalRecordFromThreadSchema,
  createAuthorizationFromThreadSchema,
  convertToAllergySchema,
  convertToDiagnosisSchema,
  createMedicationFromThreadSchema,
  createVaccineFromThreadSchema,
} from './health-thread.schema.js'
import { NotFoundError } from '../../../domain/errors.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { assertPatientAccess, filterByPatientAccess } from '../auth/patient-access.guard.js'
import { guardPatientEntity } from '../auth/patient-entity.guard.js'

export class HealthThreadController {
  constructor(
    private readonly service: HealthThreadService,
    private readonly workflow?: HealthThreadWorkflowService,
  ) {}

  async create(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = createHealthThreadSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.patientId)) return
    const thread = await this.service.create({
      ...parsed.data,
      createdBy: req.accountId ?? undefined,
    })
    return reply.status(201).send(thread.toJSON())
  }

  async wizardInvestigation(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!this.workflow) return reply.status(503).send({ message: 'Workflow service unavailable' })
    const parsed = investigationWizardSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.patientId)) return
    const thread = await this.workflow.startInvestigation({
      ...parsed.data,
      createdBy: req.accountId ?? undefined,
    })
    return reply.status(201).send(thread.toJSON())
  }

  async wizardTask(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!this.workflow) return reply.status(503).send({ message: 'Workflow service unavailable' })
    const parsed = taskWizardSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.patientId)) return
    const thread = await this.workflow.startTask({
      ...parsed.data,
      createdBy: req.accountId ?? undefined,
    })
    return reply.status(201).send(thread.toJSON())
  }

  async getDetail(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!this.workflow) return reply.status(503).send({ message: 'Workflow service unavailable' })
    const parsed = healthThreadParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try {
      const existing = await this.service.findById(parsed.data.id)
      if (!guardPatientEntity(req, reply, existing)) return
      const detail = await this.workflow.getDetail(parsed.data.id)
      return reply.send(detail)
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }

  async addEntry(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!this.workflow) return reply.status(503).send({ message: 'Workflow service unavailable' })
    const params = healthThreadParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = addThreadEntrySchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const existing = await this.service.findById(params.data.id)
      if (!guardPatientEntity(req, reply, existing)) return
      const entry = await this.workflow.addNote(
        params.data.id,
        body.data.body,
        req.accountId ?? undefined,
      )
      return reply.status(201).send(entry.toJSON())
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }

  async createExamArtifact(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!this.workflow) return reply.status(503).send({ message: 'Workflow service unavailable' })
    const params = healthThreadParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = createExamFromThreadSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const existing = await this.service.findById(params.data.id)
      if (!guardPatientEntity(req, reply, existing)) return
      const result = await this.workflow.createExamFromThread(
        params.data.id,
        {
          patientId: existing.patientId,
          examType: body.data.examType,
          examDate: body.data.examDate,
          laboratory: body.data.laboratory,
          resultSummary: body.data.resultSummary,
          notes: body.data.notes,
          source: body.data.source ?? 'manual',
        },
        body.data.role ?? 'ordered',
        req.accountId ?? undefined,
      )
      return reply.status(201).send({
        exam: result.exam.toJSON(),
        link: result.link.toJSON(),
      })
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }

  async createMedicalRecordArtifact(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!this.workflow) return reply.status(503).send({ message: 'Workflow service unavailable' })
    const params = healthThreadParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = createMedicalRecordFromThreadSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const existing = await this.service.findById(params.data.id)
      if (!guardPatientEntity(req, reply, existing)) return
      const result = await this.workflow.createMedicalRecordFromThread(
        params.data.id,
        {
          patientId: existing.patientId,
          recordDate: body.data.recordDate,
          recordType: body.data.recordType,
          description: body.data.description,
          doctorName: body.data.doctorName,
          specialty: body.data.specialty,
          clinicName: body.data.clinicName,
          notes: body.data.notes,
          source: body.data.source ?? 'manual',
        },
        body.data.role ?? 'related',
        req.accountId ?? undefined,
      )
      return reply.status(201).send({
        record: result.record.toJSON(),
        link: result.link.toJSON(),
      })
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }

  async createAuthorizationArtifact(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!this.workflow) return reply.status(503).send({ message: 'Workflow service unavailable' })
    const params = healthThreadParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = createAuthorizationFromThreadSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const existing = await this.service.findById(params.data.id)
      if (!guardPatientEntity(req, reply, existing)) return
      const result = await this.workflow.createAuthorizationFromThread(
        params.data.id,
        {
          patientId: existing.patientId,
          procedureDescription: body.data.procedureDescription,
          authorizationDate: body.data.authorizationDate,
          validityDate: body.data.validityDate,
          status: body.data.status,
          guideNumber: body.data.guideNumber,
          doctorName: body.data.doctorName,
          clinicName: body.data.clinicName,
          source: body.data.source ?? 'manual',
        },
        body.data.role ?? 'ordered',
        req.accountId ?? undefined,
      )
      return reply.status(201).send({
        authorization: result.authorization.toJSON(),
        link: result.link.toJSON(),
      })
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }

  async createMedicationArtifact(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!this.workflow) return reply.status(503).send({ message: 'Workflow service unavailable' })
    const params = healthThreadParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = createMedicationFromThreadSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const existing = await this.service.findById(params.data.id)
      if (!guardPatientEntity(req, reply, existing)) return
      const result = await this.workflow.createMedicationFromThread(
        params.data.id,
        {
          patientId: existing.patientId,
          genericName: body.data.genericName,
          brandName: body.data.brandName,
          dosage: body.data.dosage,
          frequency: body.data.frequency,
          route: body.data.route,
          startDate: body.data.startDate,
          prescribingDoctor: body.data.prescribingDoctor,
          notes: body.data.notes,
        },
        body.data.role ?? 'ordered',
        req.accountId ?? undefined,
      )
      return reply.status(201).send({
        medication: result.medication.toJSON(),
        link: result.link.toJSON(),
      })
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }

  async createVaccineArtifact(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!this.workflow) return reply.status(503).send({ message: 'Workflow service unavailable' })
    const params = healthThreadParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = createVaccineFromThreadSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const existing = await this.service.findById(params.data.id)
      if (!guardPatientEntity(req, reply, existing)) return
      const result = await this.workflow.createVaccineFromThread(
        params.data.id,
        {
          patientId: existing.patientId,
          vaccineName: body.data.vaccineName,
          applicationDate: body.data.applicationDate,
          doseNumber: body.data.doseNumber,
          batchNumber: body.data.batchNumber,
          clinic: body.data.clinic,
          appliedBy: body.data.appliedBy,
          notes: body.data.notes,
          source: body.data.source ?? 'manual',
        },
        body.data.role ?? 'related',
        req.accountId ?? undefined,
      )
      return reply.status(201).send({
        vaccine: result.vaccine.toJSON(),
        link: result.link.toJSON(),
      })
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }

  async convertToAllergy(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!this.workflow) return reply.status(503).send({ message: 'Workflow service unavailable' })
    const params = healthThreadParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = convertToAllergySchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const existing = await this.service.findById(params.data.id)
      if (!guardPatientEntity(req, reply, existing)) return
      const result = await this.workflow.convertToAllergy(
        params.data.id,
        body.data,
        req.accountId ?? undefined,
      )
      return reply.send({
        allergy: result.allergy.toJSON(),
        thread: result.thread.toJSON(),
      })
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      if (err instanceof Error) return reply.status(400).send({ message: err.message })
      throw err
    }
  }

  async convertToDiagnosis(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!this.workflow) return reply.status(503).send({ message: 'Workflow service unavailable' })
    const params = healthThreadParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = convertToDiagnosisSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const existing = await this.service.findById(params.data.id)
      if (!guardPatientEntity(req, reply, existing)) return
      const result = await this.workflow.convertToDiagnosis(
        params.data.id,
        body.data,
        req.accountId ?? undefined,
      )
      return reply.send({
        diagnosis: result.diagnosis.toJSON(),
        thread: result.thread.toJSON(),
      })
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      if (err instanceof Error) return reply.status(400).send({ message: err.message })
      throw err
    }
  }

  async linkArtifact(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!this.workflow) return reply.status(503).send({ message: 'Workflow service unavailable' })
    const params = healthThreadParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = linkArtifactSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const existing = await this.service.findById(params.data.id)
      if (!guardPatientEntity(req, reply, existing)) return
      const link = await this.workflow.linkArtifact(
        params.data.id,
        body.data.entityType,
        body.data.entityId,
        body.data.role ?? 'related',
        body.data.label,
      )
      return reply.status(201).send(link.toJSON())
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      if (err instanceof Error && err.message.includes('not supported')) {
        return reply.status(400).send({ message: err.message })
      }
      throw err
    }
  }

  async findById(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = healthThreadParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try {
      const thread = await this.service.findById(parsed.data.id)
      if (!guardPatientEntity(req, reply, thread)) return
      return reply.send(thread.toJSON())
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }

  async findAll(req: AuthenticatedRequest, reply: FastifyReply) {
    const query = healthThreadQuerySchema.safeParse(req.query)
    const filter = query.success ? query.data : undefined
    if (filter?.patientId && !assertPatientAccess(req, reply, filter.patientId)) return
    const items = await this.service.findAll(filter)
    return reply.send(filterByPatientAccess(req, items, (i) => i.patientId).map((i) => i.toJSON()))
  }

  async update(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = healthThreadParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = updateHealthThreadSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const existing = await this.service.findById(params.data.id)
      if (!guardPatientEntity(req, reply, existing)) return
      const thread = await this.service.update(params.data.id, body.data)
      return reply.send(thread.toJSON())
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }

  async close(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = healthThreadParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = closeHealthThreadSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const existing = await this.service.findById(params.data.id)
      if (!guardPatientEntity(req, reply, existing)) return
      const thread = await this.service.close(params.data.id, body.data.status)
      return reply.send(thread.toJSON())
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }

  async delete(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = healthThreadParamsSchema.safeParse(req.params)
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
}
