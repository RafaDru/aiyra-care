import type { Pool } from 'pg'
import { ClinicalEntityLink } from '../../domain/clinical-link/clinical-entity-link.entity.js'
import type { ClinicalEntityType } from '../../domain/clinical-link/clinical-entity-type.js'
import { isClinicalEntityType } from '../../domain/clinical-link/clinical-entity-type.js'
import type { ClinicalEntityLinkRepository } from '../../domain/clinical-link/clinical-entity-link.repository.js'
import type { RelationTypeRepository } from '../../domain/clinical-link/relation-type.repository.js'
import type { HealthThreadRepository } from '../../domain/health-thread/health-thread.repository.js'
import type { HealthThreadLinkRepository } from '../../domain/health-thread/health-thread-link.repository.js'
import type { ExamRepository } from '../../domain/exam/exam.repository.js'
import type { MedicalRecordRepository } from '../../domain/medical-record/medical-record.repository.js'
import type { AuthorizationRepository } from '../../domain/authorization/authorization.repository.js'
import type { MedicationRepository } from '../../domain/medication/medication.repository.js'
import type { VaccineRepository } from '../../domain/vaccine/vaccine.repository.js'
import type { DiagnosisRepository } from '../../domain/diagnosis/diagnosis.repository.js'
import { NotFoundError } from '../../domain/errors.js'
import type { ClinicalEntityGraphProjector } from '../../infrastructure/graph/clinical-entity-graph.projector.js'

export interface CreateClinicalLinkInput {
  patientId: string
  fromEntityType: ClinicalEntityType
  fromEntityId: string
  toEntityType: ClinicalEntityType
  toEntityId: string
  relationCode: string
  label?: string | null
  healthThreadId?: string | null
  createdBy?: string | null
}

export interface ClinicalFlowNode {
  entityType: ClinicalEntityType
  entityId: string
  title: string
  subtitle?: string
  date?: string
  inThread?: boolean
}

export interface ClinicalFlowEdge {
  id: string
  relationCode: string
  relationLabel: string
  neo4jRelType: string
  fromEntityType: ClinicalEntityType
  fromEntityId: string
  toEntityType: ClinicalEntityType
  toEntityId: string
  label: string | null
}

export interface ClinicalFlow {
  nodes: ClinicalFlowNode[]
  edges: ClinicalFlowEdge[]
}

export class ClinicalLinkService {
  constructor(
    private readonly pool: Pool,
    private readonly relationTypes: RelationTypeRepository,
    private readonly links: ClinicalEntityLinkRepository,
    private readonly threads: HealthThreadRepository,
    private readonly threadLinks: HealthThreadLinkRepository,
    private readonly exams: ExamRepository,
    private readonly medicalRecords: MedicalRecordRepository,
    private readonly authorizations: AuthorizationRepository,
    private readonly medications: MedicationRepository,
    private readonly vaccines: VaccineRepository,
    private readonly diagnoses: DiagnosisRepository,
    private readonly graphProjector?: ClinicalEntityGraphProjector,
  ) {}

  async listRelationTypes(fromType?: string, toType?: string) {
    const all = await this.relationTypes.findAll()
    return all
      .filter((t) => {
        if (!fromType && !toType) return true
        if (t.fromEntityType === 'clinical_entity') return true
        if (fromType && t.fromEntityType !== fromType) return false
        if (toType && t.toEntityType !== toType && t.toEntityType !== 'clinical_entity') return false
        return true
      })
      .map((t) => t.toJSON())
  }

  async create(input: CreateClinicalLinkInput) {
    if (input.fromEntityId === input.toEntityId && input.fromEntityType === input.toEntityType) {
      throw new Error('Origem e destino não podem ser iguais')
    }

    const relationType = await this.relationTypes.findByCode(input.relationCode)
    if (!relationType) throw new Error(`Tipo de relação inválido: ${input.relationCode}`)
    if (!relationType.matches(input.fromEntityType, input.toEntityType)) {
      throw new Error(`Relação ${input.relationCode} não permite ${input.fromEntityType} → ${input.toEntityType}`)
    }

    if (input.healthThreadId) {
      const thread = await this.threads.findById(input.healthThreadId)
      if (!thread) throw new NotFoundError('HealthThread', input.healthThreadId)
      if (thread.patientId !== input.patientId) throw new Error('Trilha não pertence ao paciente')
    }

    await this.assertEntityBelongsToPatient(input.patientId, input.fromEntityType, input.fromEntityId)
    await this.assertEntityBelongsToPatient(input.patientId, input.toEntityType, input.toEntityId)

    const link = ClinicalEntityLink.create({
      patientId: input.patientId,
      fromEntityType: input.fromEntityType,
      fromEntityId: input.fromEntityId,
      toEntityType: input.toEntityType,
      toEntityId: input.toEntityId,
      relationCode: input.relationCode,
      label: input.label,
      healthThreadId: input.healthThreadId,
      createdBy: input.createdBy,
    })

    const saved = await this.links.create(link)
    await this.applyModelShortcuts(saved)
    this.graphProjector?.scheduleLink(saved, relationType)
    return saved.toJSON()
  }

  async getById(id: string) {
    const link = await this.links.findById(id)
    if (!link) throw new NotFoundError('ClinicalEntityLink', id)
    return link.toJSON()
  }

  async delete(id: string, patientId: string) {
    const existing = await this.links.findById(id)
    if (!existing) throw new NotFoundError('ClinicalEntityLink', id)
    if (existing.patientId !== patientId) throw new Error('Link não pertence ao paciente')

    const relationType = await this.relationTypes.findByCode(existing.relationCode)
    await this.links.delete(id)
    if (relationType) this.graphProjector?.scheduleUnlink(existing, relationType)
  }

  async listForPatient(patientId: string, entityType?: string, entityId?: string) {
    const filter: { patientId: string; entityType?: ClinicalEntityType; entityId?: string } = {
      patientId,
    }
    if (entityType && entityId && isClinicalEntityType(entityType)) {
      filter.entityType = entityType
      filter.entityId = entityId
    }
    const rows = await this.links.findMany(filter)
    const types = await this.relationTypes.findAll()
    const typeMap = new Map(types.map((t) => [t.code, t]))

    const filterEntityType = filter.entityType
    const filterEntityId = filter.entityId

    return Promise.all(
      rows.map(async (row) => {
        const json = row.toJSON()
        const rel = typeMap.get(json.relationCode)
        const base = {
          ...json,
          createdAt: json.createdAt.toISOString(),
          relationLabel: rel?.label ?? json.relationCode,
          neo4jRelType: rel?.neo4jRelType ?? 'RELATED',
        }

        if (!filterEntityType || !filterEntityId) return base

        const isFrom =
          json.fromEntityType === filterEntityType && json.fromEntityId === filterEntityId
        const peerType = isFrom ? json.toEntityType : json.fromEntityType
        const peerId = isFrom ? json.toEntityId : json.fromEntityId
        const summary = await this.entitySummary(patientId, peerType, peerId)

        return {
          ...base,
          direction: isFrom ? 'outgoing' : 'incoming',
          peerEntity: summary
            ? {
                entityType: summary.entityType,
                entityId: summary.entityId,
                title: summary.title,
                subtitle: summary.subtitle,
                date: summary.date,
              }
            : {
                entityType: peerType,
                entityId: peerId,
                title: peerType,
              },
        }
      }),
    )
  }

  async linkCounts(patientId: string) {
    return this.links.countByEntities(patientId)
  }

  async getThreadClinicalFlow(threadId: string): Promise<ClinicalFlow> {
    const thread = await this.threads.findById(threadId)
    const threadLinkList = await this.threadLinks.findByThreadId(threadId)

    const entityKeys = new Set<string>()
    for (const l of threadLinkList) {
      if (isClinicalEntityType(l.entityType)) {
        entityKeys.add(`${l.entityType}:${l.entityId}`)
      }
    }

    const allPatientLinks = await this.links.findMany({ patientId: thread.patientId })
    const edges: ClinicalFlowEdge[] = []
    const types = await this.relationTypes.findAll()
    const typeMap = new Map(types.map((t) => [t.code, t]))

    for (const link of allPatientLinks) {
      const d = link.toJSON()
      const fromKey = `${d.fromEntityType}:${d.fromEntityId}`
      const toKey = `${d.toEntityType}:${d.toEntityId}`
      if (!entityKeys.has(fromKey) && !entityKeys.has(toKey)) continue
      if (!entityKeys.has(fromKey) || !entityKeys.has(toKey)) continue

      const rel = typeMap.get(d.relationCode)
      edges.push({
        id: d.id,
        relationCode: d.relationCode,
        relationLabel: rel?.label ?? d.relationCode,
        neo4jRelType: rel?.neo4jRelType ?? 'RELATED',
        fromEntityType: d.fromEntityType,
        fromEntityId: d.fromEntityId,
        toEntityType: d.toEntityType,
        toEntityId: d.toEntityId,
        label: d.label,
      })
      entityKeys.add(fromKey)
      entityKeys.add(toKey)
    }

    const nodes: ClinicalFlowNode[] = []
    for (const key of entityKeys) {
      const [entityType, entityId] = key.split(':')
      if (!isClinicalEntityType(entityType)) continue
      const summary = await this.entitySummary(thread.patientId, entityType, entityId)
      if (!summary) continue
      nodes.push({
        ...summary,
        inThread: threadLinkList.some((l) => l.entityType === entityType && l.entityId === entityId),
      })
    }

    return { nodes, edges }
  }

  private async applyModelShortcuts(link: ClinicalEntityLink) {
    const d = link.toJSON()
    if (d.relationCode === 'ORDERED_AUTH' && d.fromEntityType === 'medical_record' && d.toEntityType === 'authorization') {
      await this.pool.query(
        `UPDATE authorizations SET medical_record_id = $1, updated_at = NOW()
         WHERE id = $2 AND patient_id = $3 AND medical_record_id IS NULL`,
        [d.fromEntityId, d.toEntityId, d.patientId],
      )
    }
    if (d.relationCode === 'ORDERED_EXAM' && d.fromEntityType === 'medical_record' && d.toEntityType === 'exam') {
      await this.pool.query(
        `UPDATE exams SET medical_record_id = $1 WHERE id = $2 AND patient_id = $3 AND medical_record_id IS NULL`,
        [d.fromEntityId, d.toEntityId, d.patientId],
      )
    }
  }

  private async entitySummary(
    patientId: string,
    entityType: ClinicalEntityType,
    entityId: string,
  ): Promise<Omit<ClinicalFlowNode, 'inThread'> | null> {
    switch (entityType) {
      case 'exam': {
        const exam = await this.exams.findById(entityId)
        if (!exam || exam.patientId !== patientId) return null
        return {
          entityType,
          entityId,
          title: exam.examType,
          subtitle: exam.laboratory ?? undefined,
          date: exam.examDate.toISOString(),
        }
      }
      case 'medical_record': {
        const r = await this.medicalRecords.findById(entityId)
        if (!r || r.patientId !== patientId) return null
        return {
          entityType,
          entityId,
          title: r.doctorName ?? r.specialty ?? r.clinicName ?? 'Consulta',
          subtitle: r.description ?? undefined,
          date: r.recordDate.toISOString(),
        }
      }
      case 'authorization': {
        const a = await this.authorizations.findById(entityId)
        if (!a || a.patientId !== patientId) return null
        return {
          entityType,
          entityId,
          title: a.classification ?? a.procedureDescription ?? 'Autorização',
          subtitle: a.guidePassword ? `Senha ${a.guidePassword}` : undefined,
          date: a.authorizationDate?.toISOString() ?? a.createdAt.toISOString(),
        }
      }
      case 'medication': {
        const m = await this.medications.findById(entityId)
        if (!m || m.patientId !== patientId) return null
        return {
          entityType,
          entityId,
          title: m.genericName ?? m.brandName ?? 'Medicamento',
          subtitle: m.dosage ?? undefined,
          date: m.startDate?.toISOString() ?? m.startedAt?.toISOString(),
        }
      }
      case 'vaccine': {
        const v = await this.vaccines.findById(entityId)
        if (!v || v.patientId !== patientId) return null
        return {
          entityType,
          entityId,
          title: v.vaccineName,
          date: v.applicationDate.toISOString(),
        }
      }
      case 'diagnosis': {
        const diag = await this.diagnoses.findById(entityId)
        if (!diag || diag.patientId !== patientId) return null
        return {
          entityType,
          entityId,
          title: diag.diagnosisName,
          date: diag.diagnosedDate?.toISOString(),
        }
      }
      case 'health_thread': {
        const t = await this.threads.findById(entityId)
        if (!t || t.patientId !== patientId) return null
        return {
          entityType,
          entityId,
          title: t.title,
          subtitle: t.kind,
          date: t.createdAt.toISOString(),
        }
      }
      default:
        return null
    }
  }

  private async assertEntityBelongsToPatient(
    patientId: string,
    entityType: ClinicalEntityType,
    entityId: string,
  ) {
    const summary = await this.entitySummary(patientId, entityType, entityId)
    if (!summary) throw new NotFoundError(entityType, entityId)
  }
}
