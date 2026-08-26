import type { PatientRepository } from '../../domain/patient/patient.repository.js'
import type { ExamRepository } from '../../domain/exam/exam.repository.js'
import type { HealthThreadRepository } from '../../domain/health-thread/health-thread.repository.js'

export interface AvaContextSuggestion {
  id: string
  label: string
  message: string
  kind: 'patient' | 'recent_exams' | 'health_threads'
}

export class AvaContextSuggestionsService {
  constructor(
    private readonly patients: PatientRepository,
    private readonly exams: ExamRepository,
    private readonly healthThreads: HealthThreadRepository,
  ) {}

  async listForPatient(patientId: string): Promise<AvaContextSuggestion[]> {
    const patient = await this.patients.findById(patientId)
    if (!patient) return []

    const exams = await this.exams.findAll({ patientId })
    const threads = await this.healthThreads.findAll({ patientId, activeOnly: true })
    const recentCount = exams.length

    const suggestions: AvaContextSuggestion[] = [
      {
        id: 'patient',
        kind: 'patient',
        label: `Sobre ${patient.name.split(' ')[0]}`,
        message: `Me ajude a organizar o que é mais importante no prontuário de ${patient.name} para conversar com o pediatra.`,
      },
    ]

    if (recentCount > 0) {
      suggestions.push({
        id: 'recent_exams',
        kind: 'recent_exams',
        label: 'Exames recentes',
        message: `Quais exames recentes de ${patient.name} merecem atenção na conversa com o pediatra? Resuma datas e alterações.`,
      })
    }

    if (threads.length > 0) {
      const titles = threads.slice(0, 3).map((t) => t.title).join(', ')
      suggestions.push({
        id: 'health_threads',
        kind: 'health_threads',
        label: 'Acompanhamentos',
        message: `Tenho estes acompanhamentos ativos (${titles}). O que devo priorizar com o pediatra?`,
      })
    }

    return suggestions
  }
}
