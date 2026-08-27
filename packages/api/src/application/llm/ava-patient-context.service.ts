import type { PatientRepository } from '../../domain/patient/patient.repository.js'
import type { ExamRepository } from '../../domain/exam/exam.repository.js'
import type { AllergyRepository } from '../../domain/allergy/allergy.repository.js'
import type { MedicationRepository } from '../../domain/medication/medication.repository.js'
import type { MedicalRecordRepository } from '../../domain/medical-record/medical-record.repository.js'
import type { DiagnosisRepository } from '../../domain/diagnosis/diagnosis.repository.js'
import type { VaccineRepository } from '../../domain/vaccine/vaccine.repository.js'
import type { AuthorizationRepository } from '../../domain/authorization/authorization.repository.js'
import type { HealthThreadRepository } from '../../domain/health-thread/health-thread.repository.js'
import type { CareReminderRepository } from '../../domain/care-reminder/care-reminder.repository.js'
import type { MeasurementRepository } from '../../domain/measurement/measurement.repository.js'
import type { ExamResultItemRepository } from '../../domain/exam-result-item/exam-result-item.repository.js'
import { NotFoundError } from '../../domain/errors.js'
import { ageInYears } from '../../domain/patient/age-rules.js'
import {
  EXAM_INTENT_RE,
  groupExamRows,
  groupVaccineRows,
  VACCINE_INTENT_RE,
} from '../../domain/llm/ava-context-aggregate.js'

const AGE_CATEGORY_PT: Record<string, string> = {
  children: 'criança',
  adolescents: 'adolescente',
  adults: 'adulto',
}

const GENDER_PT: Record<string, string> = {
  male: 'masculino',
  female: 'feminino',
}

export function clinicianLabelForAgeCategory(ageCategory: string): string {
  if (ageCategory === 'children' || ageCategory === 'adolescents') return 'pediatra'
  return 'médico'
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function clip(text: string | null | undefined, max = 600): string {
  if (!text?.trim()) return ''
  const t = text.trim().replace(/\s+/g, ' ')
  return t.length <= max ? t : `${t.slice(0, max)}…`
}

function sortByDateDesc<T>(items: T[], getDate: (item: T) => Date): T[] {
  return [...items].sort((a, b) => getDate(b).getTime() - getDate(a).getTime())
}

export class AvaPatientContextService {
  constructor(
    private readonly patients: PatientRepository,
    private readonly exams: ExamRepository,
    private readonly allergies: AllergyRepository,
    private readonly medications: MedicationRepository,
    private readonly medicalRecords: MedicalRecordRepository,
    private readonly diagnoses: DiagnosisRepository,
    private readonly vaccines: VaccineRepository,
    private readonly authorizations: AuthorizationRepository,
    private readonly healthThreads: HealthThreadRepository,
    private readonly careReminders: CareReminderRepository,
    private readonly measurements: MeasurementRepository,
    private readonly examResultItems?: ExamResultItemRepository,
  ) {}

  async buildContextBlock(
    patientId: string,
    options?: { userMessage?: string },
  ): Promise<{
    block: string
    patientName: string
    ageCategory: string
    clinicianLabel: string
  }> {
    const patient = await this.patients.findById(patientId)
    if (!patient) throw new NotFoundError('Paciente', patientId)

    const ageYears = ageInYears(patient.birthDate)
    const ageLabel = AGE_CATEGORY_PT[patient.ageCategory] ?? patient.ageCategory
    const gender = patient.gender ? GENDER_PT[patient.gender] ?? patient.gender : 'não informado'
    const clinicianLabel = clinicianLabelForAgeCategory(patient.ageCategory)

    const [
      allergyRows,
      medRows,
      examRows,
      recordRows,
      diagnosisRows,
      vaccineRows,
      authRows,
      threadRows,
      reminderRows,
      measurementRows,
    ] = await Promise.all([
      this.allergies.findAll({ patientId }),
      this.medications.findAll({ patientId }),
      this.exams.findAll({ patientId }),
      this.medicalRecords.findAll({ patientId }),
      this.diagnoses.findAll({ patientId }),
      this.vaccines.findAll({ patientId }),
      this.authorizations.findAll({ patientId }),
      this.healthThreads.findAll({ patientId, activeOnly: true }),
      this.careReminders.findAll({ patientId, activeOnly: true }),
      this.measurements.findObservations({ patientId }),
    ])

    const userMessage = options?.userMessage?.trim() ?? ''
    const vaccineOnly = userMessage && VACCINE_INTENT_RE.test(userMessage) && !EXAM_INTENT_RE.test(userMessage)
    const examOnly = userMessage && EXAM_INTENT_RE.test(userMessage) && !VACCINE_INTENT_RE.test(userMessage)

    const activeMeds = medRows.filter((m) => m.isActive)
    const vaccineSlice = vaccineOnly ? vaccineRows.length : 18
    const examSlice = examOnly ? 25 : 20
    const recentExams = sortByDateDesc(examRows, (e) => e.examDate).slice(0, examSlice)
    const recentRecords = examOnly
      ? sortByDateDesc(recordRows, (r) => r.recordDate).slice(0, 5)
      : sortByDateDesc(recordRows, (r) => r.recordDate).slice(0, 15)
    const recentVaccines = sortByDateDesc(vaccineRows, (v) => v.applicationDate).slice(0, vaccineSlice)
    const recentAuths = sortByDateDesc(
      authRows.filter((a) => a.authorizationDate),
      (a) => a.authorizationDate!,
    ).slice(0, 8)
    const recentMeasurements = sortByDateDesc(measurementRows, (m) => m.observedAt).slice(0, 12)

    const markerRows = this.examResultItems
      ? await this.examResultItems.findAll({ patientId })
      : []
    // Agrupa por marcador: pega as 4 medições mais recentes de cada analito
    const byMarker = new Map<string, typeof markerRows>()
    for (const item of sortByDateDesc(markerRows, (m) => m.collectedAt)) {
      const key = item.markerName.toLowerCase()
      const list = byMarker.get(key) ?? []
      if (list.length < 4) list.push(item)
      byMarker.set(key, list)
    }
    const markerLimit = examOnly ? 35 : vaccineOnly ? 12 : 30
    const markerLines = [...byMarker.values()].slice(0, markerLimit).map((items) => {
      const latest = items[0]
      const ref = latest.referenceRange ? ` ref: ${latest.referenceRange}` : ''
      const history = items.length > 1
        ? ` | histórico: ${[...items].reverse().map((i) => `${formatDate(i.collectedAt)}=${i.displayValue}${i.unit ? i.unit : ''}`).join(', ')}`
        : ''
      const status = latest.status !== 'normal' ? ` [${latest.status.toUpperCase()}]` : ''
      return `- ${latest.markerName}: ${latest.displayValue}${latest.unit ? ` ${latest.unit}` : ''} (${formatDate(latest.collectedAt)})${status}${ref}${history}`
    }).join('\n')

    const allergyLines = allergyRows.length
      ? allergyRows.map((a) => `- ${a.allergen}${a.reaction ? ` (${a.reaction})` : ''}`).join('\n')
      : '- Nenhuma alergia registrada'

    const medLines = activeMeds.length
      ? activeMeds.map((m) => `- ${m.genericName || m.brandName || 'Medicamento'}${m.dosage ? ` — ${m.dosage}` : ''}`).join('\n')
      : '- Nenhum medicamento ativo registrado'

    const examLines = recentExams.length
      ? groupExamRows(recentExams).map(({ items }) => {
        const e = items[0]
        const parts = [
          formatDate(e.examDate),
          e.examType,
          e.laboratory ? `lab: ${e.laboratory}` : null,
        ].filter(Boolean)
        const summary = clip(e.resultSummary, 500) || clip(e.notes, 300)
        const dup = items.length > 1 ? ` ×${items.length} registros (possível duplicidade)` : ''
        const resultLine = summary
          ? `\n  Resultado/resumo: ${summary}`
          : '\n  (sem resumo textual no prontuário — laudo/marcadores podem estar pendentes)'
        return `- ${parts.join(' | ')}${dup}${resultLine}`
      }).join('\n')
      : '- Nenhum exame registrado no prontuário'

    const recordLines = recentRecords.length
      ? recentRecords.map((r) => {
        const parts = [
          formatDate(r.recordDate),
          r.recordType,
          r.doctorName ? `Dr(a). ${r.doctorName}` : null,
          r.specialty ?? null,
          r.clinicName ?? null,
        ].filter(Boolean)
        const desc = clip(r.description, 400) || clip(r.notes, 300)
        return `- ${parts.join(' | ')}${desc ? `\n  ${desc}` : ''}`
      }).join('\n')
      : '- Nenhum registro clínico'

    const diagnosisLines = diagnosisRows.length
      ? diagnosisRows.map((d) => {
        const flags = [
          d.isChronic ? 'crônico' : null,
          d.status ? `status: ${d.status}` : null,
        ].filter(Boolean)
        const extra = clip(d.description, 300)
        return `- ${d.diagnosisName}${d.diagnosisCode ? ` (${d.diagnosisCode})` : ''}${flags.length ? ` [${flags.join(', ')}]` : ''}${extra ? `\n  ${extra}` : ''}`
      }).join('\n')
      : '- Nenhum diagnóstico registrado'

    const vaccineLines = recentVaccines.length
      ? groupVaccineRows(recentVaccines).map(({ items }) => {
        const v = items[0]
        const dose = v.doseNumber ? ` dose ${v.doseNumber}` : ''
        const clinic = v.clinic ? ` — ${v.clinic}` : ''
        const dup = items.length > 1 ? ` ×${items.length} registros (possível duplicidade)` : ''
        return `- ${formatDate(v.applicationDate)} | ${v.vaccineName}${dose}${clinic}${dup}`
      }).join('\n')
      : '- Nenhuma vacina registrada'

    const authLines = recentAuths.length
      ? recentAuths.map((a) => {
        const date = a.authorizationDate ? formatDate(a.authorizationDate) : 'sem data'
        return `- ${date} | ${a.procedureDescription ?? a.procedureCode ?? 'Procedimento'}${a.status ? ` (${a.status})` : ''}`
      }).join('\n')
      : '- Nenhuma autorização registrada'

    const threadLines = threadRows.length
      ? threadRows.map((t) => {
        const summary = clip(t.summary, 400)
        return `- [${t.kind}] ${t.title} (${t.status})${summary ? `\n  ${summary}` : ''}`
      }).join('\n')
      : '- Nenhum acompanhamento ativo'

    const reminderLines = reminderRows.length
      ? reminderRows.map((r) => `- ${r.title} — cada ${r.intervalMinutes} min${r.medicationName ? ` (${r.medicationName})` : ''}${r.doseHint ? ` — ${r.doseHint}` : ''}`).join('\n')
      : '- Nenhum lembrete de acompanhamento ativo'

    const measurementLines = recentMeasurements.length
      ? recentMeasurements.map((m) => {
        const val = m.valueNumeric != null
          ? `${m.valueNumeric}${m.unit ? ` ${m.unit}` : ''}`
          : '—'
        const secondary = m.valueSecondary != null ? ` / ${m.valueSecondary}` : ''
        return `- ${formatDate(m.observedAt)} | ${m.typeCode}: ${val}${secondary}${m.notes ? ` — ${clip(m.notes, 120)}` : ''}`
      }).join('\n')
      : '- Nenhuma medição recente'

    const block = [
      `Nome: ${patient.name}`,
      `Perfil: ${ageLabel}, ${formatAge(ageYears)}, sexo ${gender}`,
      `Profissional de referência sugerido na conversa: ${clinicianLabel} (não use "pediatra" para adultos)`,
      '',
      'Alergias:',
      allergyLines,
      '',
      'Medicamentos ativos:',
      medLines,
      '',
      'Diagnósticos:',
      diagnosisLines,
      '',
      'Registros clínicos (consultas, atendimentos):',
      recordLines,
      '',
      'Exames no prontuário (mais recentes primeiro):',
      examLines,
      '',
      'Vacinas:',
      vaccineLines,
      '',
      'Autorizações / guias:',
      authLines,
      '',
      'Acompanhamentos ativos (linhas de cuidado):',
      threadLines,
      '',
      'Lembretes de acompanhamento:',
      reminderLines,
      '',
      'Medições recentes (vitals, monitoramento):',
      measurementLines,
      '',
      'Marcadores laboratoriais estruturados (valores exatos com referência e histórico):',
      markerLines || '- Nenhum marcador estruturado registrado',
    ].join('\n')

    return {
      block,
      patientName: patient.name,
      ageCategory: patient.ageCategory,
      clinicianLabel,
    }
  }

  /** Contexto mínimo quando há pins de sessão — alergias + meds ativos + identidade. */
  async buildMinimalContextBlock(patientId: string): Promise<{
    block: string
    patientName: string
    ageCategory: string
    clinicianLabel: string
  }> {
    const patient = await this.patients.findById(patientId)
    if (!patient) throw new NotFoundError('Paciente', patientId)

    const ageYears = ageInYears(patient.birthDate)
    const ageLabel = AGE_CATEGORY_PT[patient.ageCategory] ?? patient.ageCategory
    const gender = patient.gender ? GENDER_PT[patient.gender] ?? patient.gender : 'não informado'
    const clinicianLabel = clinicianLabelForAgeCategory(patient.ageCategory)

    const [allergyRows, medRows] = await Promise.all([
      this.allergies.findAll({ patientId }),
      this.medications.findAll({ patientId }),
    ])
    const activeMeds = medRows.filter((m) => m.isActive)

    const allergyLines = allergyRows.length
      ? allergyRows.map((a) => `- ${a.allergen}${a.reaction ? ` (${a.reaction})` : ''}`).join('\n')
      : '- Nenhuma alergia registrada'

    const medLines = activeMeds.length
      ? activeMeds.map((m) => `- ${m.genericName || m.brandName || 'Medicamento'}${m.dosage ? ` — ${m.dosage}` : ''}`).join('\n')
      : '- Nenhum medicamento ativo registrado'

    const block = [
      `Nome: ${patient.name}`,
      `Perfil: ${ageLabel}, ${formatAge(ageYears)}, sexo ${gender}`,
      `Profissional de referência sugerido na conversa: ${clinicianLabel}`,
      '',
      '(Modo compacto — detalhes do prontuário vêm dos registros pinados abaixo.)',
      '',
      'Alergias:',
      allergyLines,
      '',
      'Medicamentos ativos:',
      medLines,
    ].join('\n')

    return {
      block,
      patientName: patient.name,
      ageCategory: patient.ageCategory,
      clinicianLabel,
    }
  }
}

function formatAge(years: number): string {
  if (years < 1) return 'menos de 1 ano'
  const whole = Math.floor(years)
  return `${whole} ${whole === 1 ? 'ano' : 'anos'}`
}
