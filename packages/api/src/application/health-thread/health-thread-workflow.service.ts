import type { Pool, PoolClient } from 'pg'
import type { HealthThreadService, HealthThreadGraphSync } from './health-thread.service.js'
import type { HealthThreadEntryRepository } from '../../domain/health-thread/health-thread-entry.repository.js'
import type { HealthThreadLinkRepository } from '../../domain/health-thread/health-thread-link.repository.js'
import type { ExamRepository } from '../../domain/exam/exam.repository.js'
import type { MedicalRecordRepository } from '../../domain/medical-record/medical-record.repository.js'
import type { AuthorizationRepository } from '../../domain/authorization/authorization.repository.js'
import type { AllergyRepository } from '../../domain/allergy/allergy.repository.js'
import type { DiagnosisRepository } from '../../domain/diagnosis/diagnosis.repository.js'
import type { MedicationRepository } from '../../domain/medication/medication.repository.js'
import type { VaccineRepository } from '../../domain/vaccine/vaccine.repository.js'
import type { DocumentRepository } from '../../domain/document/document.repository.js'
import { HealthThread } from '../../domain/health-thread/health-thread.entity.js'
import { HealthThreadEntry } from '../../domain/health-thread/health-thread-entry.entity.js'
import { HealthThreadLink } from '../../domain/health-thread/health-thread-link.entity.js'
import type { HealthThreadLinkEntityType, HealthThreadLinkRole } from '../../domain/health-thread/health-thread-link.entity.js'
import { Exam } from '../../domain/exam/exam.entity.js'
import type { ExamProps } from '../../domain/exam/exam.entity.js'
import { MedicalRecord } from '../../domain/medical-record/medical-record.entity.js'
import type { MedicalRecordProps } from '../../domain/medical-record/medical-record.entity.js'
import { Authorization } from '../../domain/authorization/authorization.entity.js'
import type { AuthorizationProps } from '../../domain/authorization/authorization.entity.js'
import { Allergy } from '../../domain/allergy/allergy.entity.js'
import { Diagnosis } from '../../domain/diagnosis/diagnosis.entity.js'
import { Medication } from '../../domain/medication/medication.entity.js'
import type { MedicationProps } from '../../domain/medication/medication.entity.js'
import { Vaccine } from '../../domain/vaccine/vaccine.entity.js'
import type { VaccineProps } from '../../domain/vaccine/vaccine.entity.js'
import { NotFoundError } from '../../domain/errors.js'

export interface InvestigationWizardInput {
  patientId: string
  title: string
  reason?: string
  workingHypothesis?: string
  symptoms?: string[]
  plannedSteps?: string[]
  createdBy?: string
}

export interface TaskWizardInput {
  patientId: string
  title: string
  summary?: string
  assignee?: string
  location?: string
  dueDate?: Date
  createdBy?: string
}

export interface HealthThreadArtifactSummary {
  entityType: string
  entityId: string
  title: string
  subtitle?: string
  date?: string
}

export interface HealthThreadTimelineItem {
  kind: 'entry' | 'link'
  id: string
  occurredAt: string
  linkedAt?: string
  entryType?: string
  body?: string
  linkRole?: string
  entityType?: string
  entityId?: string
  artifact?: HealthThreadArtifactSummary
}

export interface HealthThreadDetail {
  thread: ReturnType<HealthThread['toJSON']>
  entries: ReturnType<HealthThreadEntry['toJSON']>[]
  links: ReturnType<HealthThreadLink['toJSON']>[]
  timeline: HealthThreadTimelineItem[]
}

export class HealthThreadWorkflowService {
  constructor(
    private readonly pool: Pool,
    private readonly threads: HealthThreadService,
    private readonly entries: HealthThreadEntryRepository,
    private readonly links: HealthThreadLinkRepository,
    private readonly exams: ExamRepository,
    private readonly medicalRecords: MedicalRecordRepository,
    private readonly authorizations: AuthorizationRepository,
    private readonly allergies: AllergyRepository,
    private readonly diagnoses: DiagnosisRepository,
    private readonly medications: MedicationRepository,
    private readonly vaccines: VaccineRepository,
    private readonly documents: DocumentRepository,
    private readonly graphSync?: HealthThreadGraphSync,
  ) {}

  async startInvestigation(input: InvestigationWizardInput) {
    const metadata = {
      wizardVersion: 1,
      reason: input.reason?.trim() ?? null,
      workingHypothesis: input.workingHypothesis?.trim() ?? null,
      symptoms: input.symptoms?.filter(Boolean) ?? [],
      plannedSteps: input.plannedSteps?.filter(Boolean) ?? [],
    }

    const summaryParts = [
      input.reason?.trim(),
      input.workingHypothesis?.trim() ? `Hipótese: ${input.workingHypothesis.trim()}` : null,
    ].filter(Boolean)

    const thread = await this.threads.create({
      patientId: input.patientId,
      kind: 'investigation',
      title: input.title.trim(),
      summary: summaryParts.length > 0 ? summaryParts.join(' · ') : undefined,
      status: 'active',
      metadata,
      createdBy: input.createdBy,
    })

    await this.entries.save(
      HealthThreadEntry.create({
        threadId: thread.id,
        entryType: 'system',
        body: 'Investigação iniciada.',
        createdBy: input.createdBy,
      }),
    )

    if (input.reason?.trim()) {
      await this.entries.save(
        HealthThreadEntry.create({
          threadId: thread.id,
          entryType: 'note',
          body: input.reason.trim(),
          createdBy: input.createdBy,
        }),
      )
    }

    for (const step of metadata.plannedSteps) {
      await this.entries.save(
        HealthThreadEntry.create({
          threadId: thread.id,
          entryType: 'note',
          body: `Plano: ${step}`,
          createdBy: input.createdBy,
        }),
      )
    }

    return thread
  }

  async startTask(input: TaskWizardInput) {
    const metadata = {
      wizardVersion: 1,
      assignee: input.assignee?.trim() ?? null,
      location: input.location?.trim() ?? null,
    }

    const thread = await this.threads.create({
      patientId: input.patientId,
      kind: 'task',
      title: input.title.trim(),
      summary: input.summary?.trim() ?? undefined,
      status: 'active',
      dueDate: input.dueDate,
      metadata,
      createdBy: input.createdBy,
    })

    await this.entries.save(
      HealthThreadEntry.create({
        threadId: thread.id,
        entryType: 'system',
        body: 'Tarefa registrada.',
        createdBy: input.createdBy,
      }),
    )

    return thread
  }

  async addNote(threadId: string, body: string, createdBy?: string) {
    await this.threads.findById(threadId)
    return this.entries.save(
      HealthThreadEntry.create({
        threadId,
        entryType: 'note',
        body,
        createdBy,
      }),
    )
  }

  async linkArtifact(
    threadId: string,
    entityType: HealthThreadLinkEntityType,
    entityId: string,
    role: HealthThreadLinkRole = 'related',
    label?: string,
  ) {
    const thread = await this.threads.findById(threadId)
    await this.assertEntityBelongsToPatient(thread.patientId, entityType, entityId)

    const existing = await this.links.findByThreadAndEntity(threadId, entityType, entityId)
    if (existing) return existing

    const link = await this.links.save(
      HealthThreadLink.create({
        threadId,
        entityType,
        entityId,
        role,
        label,
      }),
    )
    this.graphSync?.scheduleLink(thread, link)
    return link
  }

  async createExamFromThread(
    threadId: string,
    examData: ExamProps,
    linkRole: HealthThreadLinkRole = 'ordered',
    createdBy?: string,
  ) {
    const thread = await this.threads.findById(threadId)
    if (examData.patientId !== thread.patientId) {
      throw new Error('Exam patientId must match thread patient')
    }

    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const exam = await this.saveExamWithClient(client, Exam.create(examData))
      const link = await this.saveLinkWithClient(
        client,
        HealthThreadLink.create({
          threadId,
          entityType: 'exam',
          entityId: exam.id,
          role: linkRole,
          label: exam.examType,
        }),
      )
      await client.query('COMMIT')

      this.graphSync?.scheduleLink(thread, link)

      await this.entries.save(
        HealthThreadEntry.create({
          threadId,
          entryType: 'system',
          body: `Exame registrado: ${exam.examType}`,
          createdBy,
        }),
      )

      return { exam, link }
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  }

  async createMedicalRecordFromThread(
    threadId: string,
    data: MedicalRecordProps,
    linkRole: HealthThreadLinkRole = 'related',
    createdBy?: string,
  ) {
    const thread = await this.threads.findById(threadId)
    if (data.patientId !== thread.patientId) throw new Error('Record patientId must match thread patient')

    const record = await this.medicalRecords.save(MedicalRecord.create(data))
    const link = await this.links.save(
      HealthThreadLink.create({
        threadId,
        entityType: 'medical_record',
        entityId: record.id,
        role: linkRole,
        label: record.description ?? record.recordType,
      }),
    )
    this.graphSync?.scheduleLink(thread, link)
    await this.entries.save(
      HealthThreadEntry.create({
        threadId,
        entryType: 'system',
        body: `Consulta/registro: ${record.description ?? record.recordType}`,
        createdBy,
      }),
    )
    return { record, link }
  }

  async createAuthorizationFromThread(
    threadId: string,
    data: AuthorizationProps,
    linkRole: HealthThreadLinkRole = 'ordered',
    createdBy?: string,
  ) {
    const thread = await this.threads.findById(threadId)
    if (data.patientId !== thread.patientId) throw new Error('Authorization patientId must match thread patient')

    const auth = await this.authorizations.save(
      Authorization.create({ ...data, status: data.status ?? 'authorized' }),
    )
    const link = await this.links.save(
      HealthThreadLink.create({
        threadId,
        entityType: 'authorization',
        entityId: auth.id,
        role: linkRole,
        label: auth.procedureDescription ?? auth.guideNumber ?? 'Autorização',
      }),
    )
    this.graphSync?.scheduleLink(thread, link)
    await this.entries.save(
      HealthThreadEntry.create({
        threadId,
        entryType: 'system',
        body: `Autorização: ${auth.procedureDescription ?? auth.guideNumber ?? 'pedido'}`,
        createdBy,
      }),
    )
    return { authorization: auth, link }
  }

  async createMedicationFromThread(
    threadId: string,
    data: MedicationProps,
    linkRole: HealthThreadLinkRole = 'ordered',
    createdBy?: string,
  ) {
    const thread = await this.threads.findById(threadId)
    if (data.patientId !== thread.patientId) throw new Error('Medication patientId must match thread patient')

    const medication = await this.medications.save(Medication.create(data))
    const link = await this.links.save(
      HealthThreadLink.create({
        threadId,
        entityType: 'medication',
        entityId: medication.id,
        role: linkRole,
        label: medication.genericName,
      }),
    )
    this.graphSync?.scheduleLink(thread, link)
    await this.entries.save(
      HealthThreadEntry.create({
        threadId,
        entryType: 'system',
        body: `Medicamento: ${medication.genericName}`,
        createdBy,
      }),
    )
    return { medication, link }
  }

  async createVaccineFromThread(
    threadId: string,
    data: VaccineProps,
    linkRole: HealthThreadLinkRole = 'related',
    createdBy?: string,
  ) {
    const thread = await this.threads.findById(threadId)
    if (data.patientId !== thread.patientId) throw new Error('Vaccine patientId must match thread patient')

    const vaccine = await this.vaccines.save(Vaccine.create(data))
    const link = await this.links.save(
      HealthThreadLink.create({
        threadId,
        entityType: 'vaccine',
        entityId: vaccine.id,
        role: linkRole,
        label: vaccine.vaccineName,
      }),
    )
    this.graphSync?.scheduleLink(thread, link)
    await this.entries.save(
      HealthThreadEntry.create({
        threadId,
        entryType: 'system',
        body: `Vacina: ${vaccine.vaccineName}`,
        createdBy,
      }),
    )
    return { vaccine, link }
  }

  async convertToAllergy(
    threadId: string,
    input: { allergen: string; reaction?: string; severity?: string; notes?: string },
    createdBy?: string,
  ) {
    const thread = await this.threads.findById(threadId)
    if (thread.kind !== 'hypothesis') {
      throw new Error('Conversão para alergia só é permitida para hipóteses')
    }

    const allergy = await this.allergies.save(
      Allergy.create({
        patientId: thread.patientId,
        allergen: input.allergen,
        reaction: input.reaction,
        severity: input.severity,
        notes: input.notes,
        diagnosedDate: new Date(),
      }),
    )
    const allergyLink = await this.links.save(
      HealthThreadLink.create({
        threadId,
        entityType: 'allergy',
        entityId: allergy.id,
        role: 'result',
        label: allergy.allergen,
      }),
    )
    this.graphSync?.scheduleLink(thread, allergyLink)
    await this.entries.save(
      HealthThreadEntry.create({
        threadId,
        entryType: 'system',
        body: `Hipótese confirmada como alergia: ${allergy.allergen}`,
        createdBy,
      }),
    )
    const closed = await this.threads.close(threadId, 'converted')
    return { allergy, thread: closed }
  }

  async convertToDiagnosis(
    threadId: string,
    input: {
      diagnosisName: string
      diagnosisCode?: string
      description?: string
      isChronic?: boolean
      diagnosedDate?: Date
      status?: string
    },
    createdBy?: string,
  ) {
    const thread = await this.threads.findById(threadId)
    if (thread.kind !== 'hypothesis' && thread.kind !== 'investigation') {
      throw new Error('Conversão para diagnóstico exige hipótese ou investigação')
    }

    const diagnosis = await this.diagnoses.save(
      Diagnosis.create({
        patientId: thread.patientId,
        diagnosisName: input.diagnosisName,
        diagnosisCode: input.diagnosisCode,
        description: input.description,
        isChronic: input.isChronic ?? false,
        diagnosedDate: input.diagnosedDate ?? new Date(),
        status: input.status ?? 'active',
      }),
    )
    const diagnosisLink = await this.links.save(
      HealthThreadLink.create({
        threadId,
        entityType: 'diagnosis',
        entityId: diagnosis.id,
        role: 'result',
        label: diagnosis.diagnosisName,
      }),
    )
    this.graphSync?.scheduleLink(thread, diagnosisLink)
    await this.entries.save(
      HealthThreadEntry.create({
        threadId,
        entryType: 'system',
        body: `Diagnóstico registrado: ${diagnosis.diagnosisName}`,
        createdBy,
      }),
    )
    const closed = await this.threads.close(threadId, 'converted')
    return { diagnosis, thread: closed }
  }

  async getDetail(threadId: string): Promise<HealthThreadDetail> {
    const thread = await this.threads.findById(threadId)
    const entryList = await this.entries.findByThreadId(threadId)
    const linkList = await this.links.findByThreadId(threadId)

    const artifactMap = await this.loadArtifacts(thread.patientId, linkList)

    const timeline: HealthThreadTimelineItem[] = []

    for (const e of entryList) {
      timeline.push({
        kind: 'entry',
        id: e.id,
        occurredAt: e.occurredAt.toISOString(),
        entryType: e.entryType,
        body: e.body,
      })
    }

    for (const l of linkList) {
      const key = `${l.entityType}:${l.entityId}`
      const artifact = artifactMap.get(key)
      const entityDate = artifact?.date
      timeline.push({
        kind: 'link',
        id: l.id,
        occurredAt: entityDate ?? l.createdAt.toISOString(),
        linkedAt: l.createdAt.toISOString(),
        linkRole: l.role,
        entityType: l.entityType,
        entityId: l.entityId,
        artifact,
      })
    }

    timeline.sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime())

    return {
      thread: thread.toJSON(),
      entries: entryList.map((e) => e.toJSON()),
      links: linkList.map((l) => l.toJSON()),
      timeline,
    }
  }

  private async loadArtifacts(
    patientId: string,
    linkList: HealthThreadLink[],
  ): Promise<Map<string, HealthThreadArtifactSummary>> {
    const map = new Map<string, HealthThreadArtifactSummary>()
    const examIds = linkList.filter((l) => l.entityType === 'exam').map((l) => l.entityId)
    const recordIds = linkList.filter((l) => l.entityType === 'medical_record').map((l) => l.entityId)
    const authIds = linkList.filter((l) => l.entityType === 'authorization').map((l) => l.entityId)
    const medicationIds = linkList.filter((l) => l.entityType === 'medication').map((l) => l.entityId)
    const vaccineIds = linkList.filter((l) => l.entityType === 'vaccine').map((l) => l.entityId)
    const documentIds = linkList.filter((l) => l.entityType === 'document').map((l) => l.entityId)

    if (examIds.length > 0) {
      const exams = await this.exams.findAll({ patientId })
      for (const exam of exams) {
        if (!examIds.includes(exam.id)) continue
        map.set(`exam:${exam.id}`, {
          entityType: 'exam',
          entityId: exam.id,
          title: exam.examType,
          subtitle: exam.laboratory ?? exam.resultSummary?.slice(0, 80) ?? undefined,
          date: exam.examDate.toISOString(),
        })
      }
    }

    if (recordIds.length > 0) {
      const records = await this.medicalRecords.findAll({ patientId })
      for (const r of records) {
        if (!recordIds.includes(r.id)) continue
        map.set(`medical_record:${r.id}`, {
          entityType: 'medical_record',
          entityId: r.id,
          title: r.description ?? r.recordType,
          subtitle: r.doctorName ?? r.clinicName ?? undefined,
          date: r.recordDate.toISOString(),
        })
      }
    }

    if (authIds.length > 0) {
      const auths = await this.authorizations.findAll({ patientId })
      for (const a of auths) {
        if (!authIds.includes(a.id)) continue
        map.set(`authorization:${a.id}`, {
          entityType: 'authorization',
          entityId: a.id,
          title: a.procedureDescription ?? a.guideNumber ?? 'Autorização',
          subtitle: a.status,
          date: a.authorizationDate?.toISOString(),
        })
      }
    }

    if (medicationIds.length > 0) {
      const meds = await this.medications.findAll({ patientId })
      for (const m of meds) {
        if (!medicationIds.includes(m.id)) continue
        map.set(`medication:${m.id}`, {
          entityType: 'medication',
          entityId: m.id,
          title: m.genericName,
          subtitle: m.dosage ?? m.frequency ?? undefined,
          date: m.startDate?.toISOString() ?? m.startedAt?.toISOString(),
        })
      }
    }

    if (vaccineIds.length > 0) {
      const vaccines = await this.vaccines.findAll({ patientId })
      for (const v of vaccines) {
        if (!vaccineIds.includes(v.id)) continue
        map.set(`vaccine:${v.id}`, {
          entityType: 'vaccine',
          entityId: v.id,
          title: v.vaccineName,
          subtitle: v.clinic ?? v.appliedBy ?? undefined,
          date: v.applicationDate.toISOString(),
        })
      }
    }

    if (documentIds.length > 0) {
      const docs = await this.documents.findAll({ patientId })
      for (const d of docs) {
        if (!documentIds.includes(d.id)) continue
        map.set(`document:${d.id}`, {
          entityType: 'document',
          entityId: d.id,
          title: d.originalFilename,
          subtitle: d.documentType,
          date: d.uploadedAt.toISOString(),
        })
      }
    }

    return map
  }

  private async assertEntityBelongsToPatient(
    patientId: string,
    entityType: string,
    entityId: string,
  ) {
    if (entityType === 'exam') {
      const exam = await this.exams.findById(entityId)
      if (!exam) throw new NotFoundError('Exam', entityId)
      if (exam.patientId !== patientId) throw new Error('Exam does not belong to patient')
      return
    }
    if (entityType === 'medical_record') {
      const r = await this.medicalRecords.findById(entityId)
      if (!r) throw new NotFoundError('MedicalRecord', entityId)
      if (r.patientId !== patientId) throw new Error('Medical record does not belong to patient')
      return
    }
    if (entityType === 'authorization') {
      const a = await this.authorizations.findById(entityId)
      if (!a) throw new NotFoundError('Authorization', entityId)
      if (a.patientId !== patientId) throw new Error('Authorization does not belong to patient')
      return
    }
    if (entityType === 'diagnosis') {
      const d = await this.diagnoses.findById(entityId)
      if (!d) throw new NotFoundError('Diagnosis', entityId)
      if (d.patientId !== patientId) throw new Error('Diagnosis does not belong to patient')
      return
    }
    if (entityType === 'allergy') {
      const al = await this.allergies.findById(entityId)
      if (!al) throw new NotFoundError('Allergy', entityId)
      if (al.patientId !== patientId) throw new Error('Allergy does not belong to patient')
      return
    }
    if (entityType === 'medication') {
      const m = await this.medications.findById(entityId)
      if (!m) throw new NotFoundError('Medication', entityId)
      if (m.patientId !== patientId) throw new Error('Medication does not belong to patient')
      return
    }
    if (entityType === 'vaccine') {
      const v = await this.vaccines.findById(entityId)
      if (!v) throw new NotFoundError('Vaccine', entityId)
      if (v.patientId !== patientId) throw new Error('Vaccine does not belong to patient')
      return
    }
    if (entityType === 'document') {
      const d = await this.documents.findById(entityId)
      if (!d) throw new NotFoundError('Document', entityId)
      if (d.patientId !== patientId) throw new Error('Document does not belong to patient')
      return
    }
    throw new Error(`Link entity type not supported yet: ${entityType}`)
  }

  private async saveExamWithClient(client: PoolClient, exam: Exam) {
    const { rows } = await client.query(
      `INSERT INTO exams (
        id, patient_id, medical_record_id, exam_type, exam_date,
        result_summary, result_file_url, laboratory, notes, source, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING id, patient_id, medical_record_id, exam_type, exam_date,
        result_summary, result_file_url, laboratory, notes, source, created_at`,
      [
        exam.id,
        exam.patientId,
        exam.medicalRecordId,
        exam.examType,
        exam.examDate,
        exam.resultSummary,
        exam.resultFileUrl,
        exam.laboratory,
        exam.notes,
        exam.source,
        exam.createdAt,
      ],
    )
    return Exam.restore({
      id: rows[0].id as string,
      patientId: rows[0].patient_id as string,
      medicalRecordId: rows[0].medical_record_id as string | null,
      examType: rows[0].exam_type as string,
      examDate: rows[0].exam_date as Date,
      resultSummary: rows[0].result_summary as string | null,
      resultFileUrl: rows[0].result_file_url as string | null,
      laboratory: rows[0].laboratory as string | null,
      notes: rows[0].notes as string | null,
      source: rows[0].source as string,
      createdAt: rows[0].created_at as Date,
    })
  }

  private async saveLinkWithClient(client: PoolClient, link: HealthThreadLink) {
    const { rows } = await client.query(
      `INSERT INTO health_thread_links (id, thread_id, entity_type, entity_id, role, label, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (thread_id, entity_type, entity_id) DO UPDATE SET role = EXCLUDED.role, label = EXCLUDED.label
       RETURNING id, thread_id, entity_type, entity_id, role, label, created_at`,
      [
        link.id,
        link.threadId,
        link.entityType,
        link.entityId,
        link.role,
        link.label,
        link.createdAt,
      ],
    )
    return HealthThreadLink.restore({
      id: rows[0].id as string,
      threadId: rows[0].thread_id as string,
      entityType: rows[0].entity_type as HealthThreadLink['entityType'],
      entityId: rows[0].entity_id as string,
      role: rows[0].role as HealthThreadLink['role'],
      label: rows[0].label as string | null,
      createdAt: rows[0].created_at as Date,
    })
  }
}
