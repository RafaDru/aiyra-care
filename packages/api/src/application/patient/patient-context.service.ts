import type { Pool } from 'pg'
import type { PatientRepository } from '../../domain/patient/patient.repository.js'
import type { AllergyRepository } from '../../domain/allergy/allergy.repository.js'
import type { MedicationRepository } from '../../domain/medication/medication.repository.js'
import type { MedicalRecordRepository } from '../../domain/medical-record/medical-record.repository.js'
import type { ExamRepository } from '../../domain/exam/exam.repository.js'
import type { VaccineRepository } from '../../domain/vaccine/vaccine.repository.js'
import type { DocumentRepository } from '../../domain/document/document.repository.js'
import type { AuthorizationRepository } from '../../domain/authorization/authorization.repository.js'
import type { IntegrationLinkRepository } from '../../domain/integration-link/integration-link.repository.js'
import type { InsurancePlanService } from '../insurance-plan/insurance-plan.service.js'
import type { HealthThreadRepository } from '../../domain/health-thread/health-thread.repository.js'
import { isExamHygieneDuplicate } from '../../domain/hygiene/exam-canonical.js'
import { isVaccineHygieneDuplicate } from '../../domain/hygiene/vaccine-notes.js'
import { ageInYears } from '../../domain/patient/age-rules.js'
import { enrichIntegrationLinksWithSyncAuthority } from '../integration-link/integration-link-sync-authority.js'
import { isOcrPending } from '../../domain/document/ocr-policy.js'
import { groupTimelineEvents } from './timeline-grouping.js'
import type {
  PatientContext,
  PatientContextAlert,
  PatientContextBuildOptions,
  PatientContextPendency,
  PatientContextTimelineEvent,
  PatientContextTimelineKind,
  PatientTimelineFilterOptions,
  PatientTimelineResponse,
  PatientClinicalExport,
  PatientClinicalExportMode,
  PatientClinicalExportSections,
} from './patient-context.types.js'
import {
  buildThreadLinkCountMap,
  deriveThreadPendencies,
  mapActiveThreadsForContext,
} from './patient-context-threads.helper.js'

const MS_PER_DAY = 24 * 60 * 60 * 1000
const MS_PER_MONTH = 30 * MS_PER_DAY

const AGE_CATEGORY_PT: Record<string, string> = {
  children: 'criança',
  adolescents: 'adolescente',
  adults: 'adulto',
}

const GENDER_PT: Record<string, string> = {
  male: 'masculino',
  female: 'feminino',
}

interface VaccineScheduleRow {
  id: string
  vaccine_name: string
  dose_label: string | null
  status: string
  expected_age_months: number | null
  expected_date: Date | string | null
}

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  return value instanceof Date ? value : new Date(value)
}

function ageInMonths(birthDate: Date, at = Date.now()): number {
  const bd = birthDate
  const now = new Date(at)
  return (now.getFullYear() - bd.getFullYear()) * 12 + (now.getMonth() - bd.getMonth())
}

function formatAgeYears(years: number): string {
  const whole = Math.floor(years)
  if (whole < 1) {
    const months = Math.max(1, Math.round(years * 12))
    return `${months} ${months === 1 ? 'mês' : 'meses'}`
  }
  return `${whole} ${whole === 1 ? 'ano' : 'anos'}`
}

function mapMedicalRecordKind(recordType: string): PatientContextTimelineKind {
  const t = recordType.toLowerCase()
  if (t.includes('extrato')) return 'extrato'
  return 'consultation'
}

function medicalRecordTitle(recordType: string, description: string | null, doctorName: string | null): string {
  if (description) return description
  if (doctorName) return `${recordType} — ${doctorName}`
  return recordType
}

function isScheduleItemOverdue(
  row: VaccineScheduleRow,
  birthDate: Date,
  now = Date.now(),
): boolean {
  if (row.status !== 'pending') return false
  const expectedDate = toDate(row.expected_date)
  if (expectedDate && expectedDate.getTime() < now) return true
  if (row.expected_age_months != null && row.expected_age_months <= ageInMonths(birthDate, now)) {
    return true
  }
  return false
}

function allergyAlertSeverity(severity: string | null): PatientContextAlert['severity'] {
  const s = (severity ?? '').toLowerCase()
  if (s.includes('severe') || s.includes('grave') || s.includes('anafil')) return 'critical'
  if (s.includes('moder') || s.includes('méd') || s.includes('med')) return 'warning'
  return 'warning'
}

export class PatientContextService {
  constructor(
    private readonly pool: Pool,
    private readonly patients: PatientRepository,
    private readonly allergies: AllergyRepository,
    private readonly medications: MedicationRepository,
    private readonly medicalRecords: MedicalRecordRepository,
    private readonly exams: ExamRepository,
    private readonly vaccines: VaccineRepository,
    private readonly documents: DocumentRepository,
    private readonly authorizations: AuthorizationRepository,
    private readonly integrationLinks: IntegrationLinkRepository,
    private readonly insurancePlans: InsurancePlanService,
    private readonly healthThreads: HealthThreadRepository,
  ) {}

  async build(patientId: string, options?: PatientContextBuildOptions): Promise<PatientContext> {
    const timelineMonths = options?.timelineMonths ?? 12
    const now = Date.now()
    const timelineCutoff = new Date(now - timelineMonths * MS_PER_MONTH)

    const patient = await this.patients.findById(patientId)
    if (!patient) throw new NotFoundError('Patient', patientId)

    const parentIds = patient.parentIds
    const [
      parentPatients,
      allergyList,
      activeMeds,
      records,
      examList,
      vaccineList,
      docList,
      authList,
      links,
      memberships,
      scheduleRows,
      activeThreadList,
    ] = await Promise.all([
      parentIds.length > 0 ? this.patients.findByIds(parentIds) : Promise.resolve([]),
      this.allergies.findAll({ patientId }),
      this.medications.findAll({ patientId, isActive: true }),
      this.medicalRecords.findAll({ patientId }),
      this.exams.findAll({ patientId }),
      this.vaccines.findAll({ patientId }),
      this.documents.findAll({ patientId }),
      this.authorizations.findAll({ patientId }),
      this.integrationLinks.findAllByPatient(patientId),
      this.insurancePlans.findMembershipsByPatient(patientId),
      this.listPendingScheduleItems(patientId),
      this.healthThreads.findAll({ patientId, activeOnly: true }),
    ])

    const birthDate = patient.birthDate
    const years = ageInYears(birthDate, now)
    const patientJson = patient.toJSON()

    const overdueSchedule = scheduleRows.filter((r) => isScheduleItemOverdue(r, birthDate, now))
    const docsPendingOcr = docList.filter((d) => isOcrPending(d.toJSON()))
    const expiringAuths = authList.filter((a) => {
      if (!a.validityDate) return false
      const daysLeft = (a.validityDate.getTime() - now) / MS_PER_DAY
      if (daysLeft < 0 || daysLeft > 30) return false
      const status = a.status.toLowerCase()
      return !status.includes('cancel') && !status.includes('negad') && !status.includes('expir')
    })

    const alerts: PatientContextAlert[] = []

    for (const allergy of allergyList) {
      alerts.push({
        severity: allergyAlertSeverity(allergy.severity),
        kind: 'allergy',
        title: `Alergia: ${allergy.allergen}`,
        detail: allergy.reaction ?? allergy.severity ?? undefined,
      })
    }

    if (activeMeds.length > 0) {
      alerts.push({
        severity: activeMeds.length >= 3 ? 'warning' : 'info',
        kind: 'medications',
        title: `${activeMeds.length} medicamento(s) ativo(s)`,
        detail: activeMeds.map((m) => m.genericName).slice(0, 5).join(', '),
      })
    }

    if (overdueSchedule.length > 0) {
      alerts.push({
        severity: 'warning',
        kind: 'vaccine_schedule',
        title: `${overdueSchedule.length} vacina(s) pendente(s) no calendário`,
        detail: overdueSchedule.map((r) => r.vaccine_name).slice(0, 5).join(', '),
      })
    }

    if (docsPendingOcr.length > 0) {
      alerts.push({
        severity: 'info',
        kind: 'document_ocr',
        title: `${docsPendingOcr.length} documento(s) sem OCR`,
      })
    }

    const workflowThreads = activeThreadList.filter(
      (t) => t.kind === 'investigation' || t.kind === 'acompanhamento' || (t.kind as string) === 'task',
    )
    if (workflowThreads.length > 0) {
      alerts.push({
        severity: 'info',
        kind: 'health_thread',
        title: `${workflowThreads.length} assunto(s) em andamento`,
        detail: workflowThreads.map((t) => t.title).slice(0, 3).join('; '),
      })
    }

    const pendencies: PatientContextPendency[] = []

    for (const row of overdueSchedule) {
      pendencies.push({
        kind: 'vaccine_schedule',
        title: row.vaccine_name,
        detail: row.dose_label ?? 'Dose pendente no calendário vacinal',
      })
    }

    for (const doc of docsPendingOcr) {
      pendencies.push({
        kind: 'document_ocr',
        title: doc.originalFilename,
        detail: 'Aguardando processamento OCR',
      })
    }

    for (const auth of expiringAuths) {
      const label = auth.procedureDescription ?? auth.guideNumber ?? 'Autorização'
      pendencies.push({
        kind: 'authorization_expiring',
        title: label,
        detail: auth.validityDate
          ? `Validade em ${auth.validityDate.toLocaleDateString('pt-BR')}`
          : undefined,
      })
    }

    const threadIds = activeThreadList.map((t) => t.id)
    const threadLinkCounts = await this.countThreadLinks(threadIds)
    const linkCountMap = buildThreadLinkCountMap(threadIds, threadLinkCounts)
    pendencies.push(...deriveThreadPendencies(activeThreadList, linkCountMap, now))

    const { rows: dueReminders } = await this.pool.query<{
      id: string
      reminder_kind: string
      title: string
      medication_name: string | null
      health_thread_id: string | null
    }>(
      `SELECT id, reminder_kind, title, medication_name, health_thread_id
       FROM care_reminders
       WHERE patient_id = $1 AND active = true AND next_fire_at <= NOW()
       ORDER BY next_fire_at
       LIMIT 8`,
      [patientId],
    )
    for (const r of dueReminders) {
      pendencies.push({
        kind: r.reminder_kind === 'medication' ? 'medication_reminder' : 'measurement_reminder',
        title: r.title,
        detail: r.medication_name ? r.medication_name : undefined,
        threadId: r.health_thread_id ?? undefined,
      })
    }

    const activeThreads = mapActiveThreadsForContext(activeThreadList, linkCountMap)

    const timeline = await this.collectTimeline(patientId, {
      cutoff: timelineCutoff,
      upperBound: new Date(now),
      threadNotesLimit: 50,
    })

    const enrichedLinks = await enrichIntegrationLinksWithSyncAuthority(this.pool, patientId, links)

    const integrations = enrichedLinks.map((link) => ({
      portalType: link.portalType,
      linkId: link.id,
      lastSyncAt: iso(link.effectiveLastSyncAt),
      syncAuthority: link.syncAuthority,
      effectiveSyncLinkId: link.effectiveSyncLinkId,
      managedByPatientId: link.managedByPatientId,
      managedByPatientName: link.managedByPatientName,
    }))

    const planMemberships = memberships.map((m) => ({
      operator: m.plan?.operator ?? m.source,
      planName: m.plan?.planName ?? 'Plano',
      memberNumber: m.memberNumber,
      role: m.role,
      status: m.status,
    }))

    const recentConsultations = records.filter(
      (r) => r.recordDate >= timelineCutoff && mapMedicalRecordKind(r.recordType) === 'consultation',
    ).length
    const recentExams = examList
      .filter((e) => !isExamHygieneDuplicate(e) && e.examDate >= timelineCutoff).length

    const textSummary = buildTextSummary({
      name: patient.name,
      ageLabel: formatAgeYears(years),
      ageCategory: AGE_CATEGORY_PT[patientJson.ageCategory] ?? patientJson.ageCategory,
      gender: patient.gender ? GENDER_PT[patient.gender] ?? patient.gender : null,
      bloodType: patient.bloodType,
      allergyCount: allergyList.length,
      activeMedCount: activeMeds.length,
      recentConsultations,
      recentExams,
      timelineMonths,
      overdueVaccines: overdueSchedule.length,
      planMemberships,
      integrations,
      pendencyCount: pendencies.length,
      activeThreadCount: activeThreadList.length,
    })

    return {
      patientId,
      generatedAt: new Date(now).toISOString(),
      identity: {
        name: patient.name,
        birthDate: birthDate.toISOString(),
        ageYears: Math.round(years * 10) / 10,
        ageCategory: patientJson.ageCategory,
        gender: patient.gender,
        bloodType: patient.bloodType,
        weightKg: patient.weightKg,
        heightCm: patient.heightCm,
        parents: parentPatients.map((p) => ({ id: p.id, name: p.name })),
      },
      alerts,
      timeline,
      pendencies,
      integrations,
      planMemberships,
      activeThreads,
      textSummary,
    }
  }

  async buildClinicalExport(
    patientId: string,
    mode: PatientClinicalExportMode = 'summary',
  ): Promise<PatientClinicalExport> {
    const timelineMonths = mode === 'full' ? 120 : 12
    const context = await this.build(patientId, { timelineMonths })
    if (mode === 'summary') {
      return { mode, context }
    }

    const [
      allergyList,
      medications,
      vaccines,
      documents,
      authorizations,
      records,
      exams,
      diagnosisRows,
    ] = await Promise.all([
      this.allergies.findAll({ patientId }),
      this.medications.findAll({ patientId }),
      this.vaccines.findAll({ patientId }),
      this.documents.findAll({ patientId }),
      this.authorizations.findAll({ patientId }),
      this.medicalRecords.findAll({ patientId }),
      this.exams.findAll({ patientId }),
      this.pool.query<{
        code: string | null
        description: string
        diagnosed_at: Date | null
      }>(
        `SELECT code, description, diagnosed_at FROM diagnoses
         WHERE patient_id = $1 ORDER BY diagnosed_at DESC NULLS LAST, created_at DESC`,
        [patientId],
      ),
    ])

    const fullSections: PatientClinicalExportSections = {
      allergies: allergyList.map((a) => ({
        allergen: a.allergen,
        severity: a.severity,
        reaction: a.reaction,
      })),
      medications: medications.map((m) => ({
        name: m.genericName,
        dose: m.dosage,
        frequency: m.frequency,
      })),
      vaccines: vaccines.filter((v) => !isVaccineHygieneDuplicate(v)).map((v) => ({
        name: v.vaccineName,
        administeredAt: iso(v.applicationDate),
        doseLabel: v.doseNumber != null ? `Dose ${v.doseNumber}` : null,
      })),
      diagnoses: diagnosisRows.rows.map((d) => ({
        code: d.code,
        description: d.description,
        diagnosedAt: iso(d.diagnosed_at),
      })),
      documents: documents.map((d) => ({
        filename: d.originalFilename,
        type: d.documentType,
        uploadedAt: d.uploadedAt.toISOString(),
        ocrProcessed: d.ocrProcessed,
      })),
      authorizations: authorizations.map((a) => ({
        title: a.procedureDescription ?? a.guideNumber ?? 'Autorização',
        date: iso(a.authorizationDate),
        status: a.status,
      })),
      medicalRecords: records.map((r) => ({
        date: r.recordDate.toISOString(),
        description: r.description,
        doctor: r.doctorName,
      })),
      exams: exams.filter((e) => !isExamHygieneDuplicate(e)).map((e) => ({
        name: e.examType,
        date: e.examDate.toISOString(),
        laboratory: e.laboratory,
      })),
    }

    return { mode, context, fullSections }
  }

  private async countThreadLinks(threadIds: string[]): Promise<Array<{ thread_id: string; count: number }>> {
    if (threadIds.length === 0) return []
    const { rows } = await this.pool.query<{ thread_id: string; count: number }>(
      `SELECT thread_id, COUNT(*)::int AS count
       FROM health_thread_links
       WHERE thread_id = ANY($1::uuid[])
       GROUP BY thread_id`,
      [threadIds],
    )
    return rows
  }

  async buildTimeline(patientId: string, options?: PatientTimelineFilterOptions): Promise<PatientTimelineResponse> {
    const patient = await this.patients.findById(patientId)
    if (!patient) throw new NotFoundError('Patient', patientId)

    const now = Date.now()
    const timelineMonths = options?.timelineMonths ?? 12
    const cutoff = options?.from ?? new Date(now - timelineMonths * MS_PER_MONTH)
    const upperBound = options?.to ?? new Date(now)

    const events = await this.collectTimeline(patientId, {
      cutoff,
      upperBound,
      threadNotesLimit: options?.limit ? Math.min(options.limit * 2, 500) : 200,
    })

    const filtered = applyTimelineFilters(events, options)
    const offset = options?.offset ?? 0
    const limit = options?.limit
    const page = limit != null ? filtered.slice(offset, offset + limit) : filtered.slice(offset)

    return {
      patientId,
      generatedAt: new Date(now).toISOString(),
      events: page,
      total: filtered.length,
    }
  }

  private async collectTimeline(
    patientId: string,
    range: { cutoff: Date; upperBound: Date; threadNotesLimit: number },
  ): Promise<PatientContextTimelineEvent[]> {
    const { cutoff, upperBound, threadNotesLimit } = range

    const [records, examList, vaccineList, authList, activeMeds] = await Promise.all([
      this.medicalRecords.findAll({ patientId }),
      this.exams.findAll({ patientId }),
      this.vaccines.findAll({ patientId }),
      this.authorizations.findAll({ patientId }),
      this.medications.findAll({ patientId, isActive: true }),
    ])

    const timeline: PatientContextTimelineEvent[] = []

    for (const r of records) {
      if (r.recordDate < cutoff || r.recordDate > upperBound) continue
      timeline.push({
        date: r.recordDate.toISOString(),
        kind: mapMedicalRecordKind(r.recordType),
        title: medicalRecordTitle(r.recordType, r.description, r.doctorName),
        subtitle: r.clinicName ?? r.specialty ?? undefined,
        source: r.source,
        entityId: r.id,
      })
    }

    for (const e of examList.filter((x) => !isExamHygieneDuplicate(x))) {
      if (e.examDate < cutoff || e.examDate > upperBound) continue
      timeline.push({
        date: e.examDate.toISOString(),
        kind: 'exam',
        title: e.examType,
        subtitle: e.laboratory ?? e.resultSummary?.slice(0, 80) ?? undefined,
        source: e.source,
        entityId: e.id,
        examOrderId: e.examOrderId ?? undefined,
      })
    }

    for (const v of vaccineList.filter((x) => !isVaccineHygieneDuplicate(x))) {
      if (v.applicationDate < cutoff || v.applicationDate > upperBound) continue
      timeline.push({
        date: v.applicationDate.toISOString(),
        kind: 'vaccine',
        title: v.vaccineName,
        subtitle: v.doseNumber != null ? `Dose ${v.doseNumber}` : undefined,
        source: v.source,
        entityId: v.id,
      })
    }

    for (const a of authList) {
      const date = a.authorizationDate ?? a.createdAt
      if (date < cutoff || date > upperBound) continue
      timeline.push({
        date: date.toISOString(),
        kind: 'authorization',
        title: a.procedureDescription ?? a.guideNumber ?? 'Autorização',
        subtitle: a.status,
        source: a.source,
        entityId: a.id,
      })
    }

    for (const m of activeMeds) {
      const start = m.startDate ?? m.startedAt
      if (!start || start < cutoff || start > upperBound) continue
      timeline.push({
        date: start.toISOString(),
        kind: 'medication_start',
        title: m.genericName,
        subtitle: m.dosage ?? m.frequency ?? undefined,
        source: 'medication',
        entityId: m.id,
      })
    }

    const threadNotes = await this.listThreadNotesForTimeline(patientId, cutoff, upperBound, threadNotesLimit)
    for (const n of threadNotes) {
      timeline.push({
        date: n.occurredAt.toISOString(),
        kind: 'thread_note',
        title: n.body.length > 80 ? `${n.body.slice(0, 77)}…` : n.body,
        subtitle: `${n.threadKind}: ${n.threadTitle}`,
        source: 'health_thread',
        entityId: n.entryId,
      })
    }

    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return groupTimelineEvents(timeline)
  }

  private async listThreadNotesForTimeline(
    patientId: string,
    cutoff: Date,
    upperBound: Date,
    limit: number,
  ) {
    const { rows } = await this.pool.query<{
      entry_id: string
      body: string
      occurred_at: Date
      thread_title: string
      thread_kind: string
    }>(
      `SELECT e.id AS entry_id, e.body, e.occurred_at, t.title AS thread_title, t.kind AS thread_kind
       FROM health_thread_entries e
       INNER JOIN health_threads t ON t.id = e.thread_id
       WHERE t.patient_id = $1
         AND e.occurred_at >= $2
         AND e.occurred_at <= $3
         AND e.entry_type IN ('note', 'symptom')
       ORDER BY e.occurred_at DESC
       LIMIT $4`,
      [patientId, cutoff, upperBound, limit],
    )
    return rows.map((r) => ({
      entryId: r.entry_id,
      body: r.body,
      occurredAt: r.occurred_at,
      threadTitle: r.thread_title,
      threadKind: r.thread_kind,
    }))
  }

  private async listPendingScheduleItems(patientId: string): Promise<VaccineScheduleRow[]> {
    const { rows } = await this.pool.query<VaccineScheduleRow>(
      `SELECT id, vaccine_name, dose_label, status, expected_age_months, expected_date
       FROM vaccine_schedule_items
       WHERE patient_id = $1 AND status = 'pending'`,
      [patientId],
    )
    return rows
  }
}

interface TextSummaryInput {
  name: string
  ageLabel: string
  ageCategory: string
  gender: string | null
  bloodType: string | null
  allergyCount: number
  activeMedCount: number
  recentConsultations: number
  recentExams: number
  timelineMonths: number
  overdueVaccines: number
  planMemberships: Array<{ operator: string; planName: string; status: string }>
  integrations: Array<{ portalType: string; lastSyncAt: string | null; syncAuthority?: string }>
  pendencyCount: number
  activeThreadCount: number
}

function buildTextSummary(input: TextSummaryInput): string {
  const sentences: string[] = []

  let intro = `${input.name}, ${input.ageLabel}, ${input.ageCategory}.`
  if (input.gender) intro += ` Sexo ${input.gender}.`
  if (input.bloodType) intro += ` Tipo sanguíneo ${input.bloodType}.`
  sentences.push(intro)

  if (input.allergyCount > 0) {
    sentences.push(
      input.allergyCount === 1
        ? 'Possui 1 alergia registrada.'
        : `Possui ${input.allergyCount} alergias registradas.`,
    )
  } else {
    sentences.push('Não há alergias registradas.')
  }

  if (input.activeMedCount > 0) {
    sentences.push(
      input.activeMedCount === 1
        ? 'Está em uso de 1 medicamento ativo.'
        : `Está em uso de ${input.activeMedCount} medicamentos ativos.`,
    )
  } else {
    sentences.push('Não há medicamentos ativos no momento.')
  }

  const activityParts: string[] = []
  if (input.recentConsultations > 0) {
    activityParts.push(
      `${input.recentConsultations} ${input.recentConsultations === 1 ? 'consulta' : 'consultas'}`,
    )
  }
  if (input.recentExams > 0) {
    activityParts.push(`${input.recentExams} ${input.recentExams === 1 ? 'exame' : 'exames'}`)
  }
  if (activityParts.length > 0) {
    sentences.push(`Nos últimos ${input.timelineMonths} meses houve ${activityParts.join(' e ')}.`)
  } else {
    sentences.push(`Sem consultas ou exames registrados nos últimos ${input.timelineMonths} meses.`)
  }

  if (input.overdueVaccines > 0) {
    sentences.push(
      input.overdueVaccines === 1
        ? 'Há 1 vacina pendente no calendário.'
        : `Há ${input.overdueVaccines} vacinas pendentes no calendário.`,
    )
  }

  const activePlans = input.planMemberships.filter((p) => p.status === 'active')
  if (activePlans.length > 0) {
    const planDesc = activePlans
      .map((p) => `${p.operator} (${p.planName})`)
      .slice(0, 2)
      .join(', ')
    sentences.push(`Plano(s) ativo(s): ${planDesc}.`)
  }

  const synced = input.integrations.filter((i) => i.lastSyncAt)
  if (synced.length > 0) {
    const latest = synced
      .map((i) => ({
        portal: i.portalType,
        at: new Date(i.lastSyncAt!),
        authority: i.syncAuthority,
      }))
      .sort((a, b) => b.at.getTime() - a.at.getTime())[0]
    const dateStr = latest.at.toLocaleDateString('pt-BR')
    const authorityNote =
      latest.authority === 'titular' ? ' (sync pelo titular)' : ''
    sentences.push(`Última sincronização de portal: ${latest.portal} em ${dateStr}${authorityNote}.`)
  }

  if (input.pendencyCount > 0 && sentences.length < 8) {
    sentences.push(
      input.pendencyCount === 1
        ? 'Existe 1 pendência a resolver.'
        : `Existem ${input.pendencyCount} pendências a resolver.`,
    )
  }

  if (input.activeThreadCount > 0 && sentences.length < 8) {
    sentences.push(
      input.activeThreadCount === 1
        ? 'Há 1 assunto em andamento na trilha de saúde.'
        : `Há ${input.activeThreadCount} assuntos em andamento na trilha de saúde.`,
    )
  }

  return sentences.slice(0, 8).join(' ')
}

export function applyTimelineFilters(
  events: PatientContextTimelineEvent[],
  options?: PatientTimelineFilterOptions,
): PatientContextTimelineEvent[] {
  if (!options) return events

  let result = events

  if (options.kinds && options.kinds.length > 0) {
    const kindSet = new Set<PatientContextTimelineKind>(options.kinds)
    result = result.filter((e) => kindSet.has(e.kind))
  }

  if (options.sources && options.sources.length > 0) {
    const sourceSet = new Set(options.sources.map((s) => s.toLowerCase()))
    result = result.filter((e) => sourceSet.has(e.source.toLowerCase()))
  }

  if (options.from) {
    const fromMs = options.from.getTime()
    result = result.filter((e) => new Date(e.date).getTime() >= fromMs)
  }

  if (options.to) {
    const toMs = options.to.getTime()
    result = result.filter((e) => new Date(e.date).getTime() <= toMs)
  }

  return result
}
