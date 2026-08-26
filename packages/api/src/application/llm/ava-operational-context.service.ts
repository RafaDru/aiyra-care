import type { ExamRepository } from '../../domain/exam/exam.repository.js'
import type { IntegrationLinkRepository } from '../../domain/integration-link/integration-link.repository.js'
import { examDocumentIdFromNotes } from '../../domain/exam/exam-notes.js'

const TAB_SECTION: Record<string, string> = {
  basic: 'overview',
  agenda: 'overview',
  'personal-documents': 'overview',
  wallet: 'plan',
  coverage: 'plan',
  integrations: 'plan',
  growth: 'clinical',
  vaccines: 'clinical',
  medications: 'clinical',
  allergies: 'clinical',
  exams: 'clinical',
  records: 'clinical',
  authorizations: 'clinical',
  diagnoses: 'clinical',
  documents: 'files',
}

const NAV_TABS: Array<{ tab: string; label: string }> = [
  { tab: 'exams', label: 'Exames e marcadores' },
  { tab: 'records', label: 'Consultas e prontuário' },
  { tab: 'medications', label: 'Medicamentos' },
  { tab: 'allergies', label: 'Alergias' },
  { tab: 'vaccines', label: 'Vacinas' },
  { tab: 'authorizations', label: 'Autorizações' },
  { tab: 'wallet', label: 'Carteira do convênio' },
  { tab: 'integrations', label: 'Integrações e sincronização' },
  { tab: 'agenda', label: 'Agenda' },
  { tab: 'documents', label: 'Arquivos clínicos' },
]

function formatDate(d: Date | null | undefined): string {
  if (!d) return 'nunca'
  return d.toISOString().slice(0, 16).replace('T', ' ')
}

function patientHref(patientId: string, tab: string, extra?: Record<string, string>): string {
  const section = TAB_SECTION[tab] ?? 'clinical'
  const params = new URLSearchParams({ section, tab })
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v) params.set(k, v)
    }
  }
  return `/patients/${patientId}?${params.toString()}`
}

function portalLabel(portalType: string): string {
  const map: Record<string, string> = {
    unimed: 'Unimed BH',
    amil: 'Amil',
    mater_dei: 'Mater Dei',
    hermes_pardini: 'Hermes Pardini',
    bradesco_saude: 'Bradesco Saúde',
    conectesus: 'ConecteSUS',
  }
  return map[portalType] ?? portalType
}

export class AvaOperationalContextService {
  constructor(
    private readonly integrationLinks: IntegrationLinkRepository,
    private readonly exams: ExamRepository,
  ) {}

  async buildOperationalBlock(patientId: string): Promise<string> {
    const [links, examRows] = await Promise.all([
      this.integrationLinks.findAllByPatient(patientId),
      this.exams.findAll({ patientId }),
    ])

    const navLines = NAV_TABS.map((t) =>
      `- ${t.label}: ${patientHref(patientId, t.tab)}`,
    )

    const linkLines = links.length
      ? links.map((l) => {
          const sync = l.lastSyncAt ? formatDate(l.lastSyncAt) : 'nunca'
          const session = l.sessionExpiresAt && l.sessionExpiresAt > new Date()
            ? 'sessão OK'
            : 'sem sessão persistida'
          return `- ${portalLabel(l.portalType)}: último sync ${sync}; ${session}; aba Integrações: ${patientHref(patientId, 'integrations')}`
        })
      : ['- Sem vínculos de integração cadastrados.']

    const fileExams = [...examRows]
      .filter((e) => e.resultFileUrl || examDocumentIdFromNotes(e.notes))
      .sort((a, b) => b.examDate.getTime() - a.examDate.getTime())
      .slice(0, 8)

    const fileLines = fileExams.length
      ? fileExams.map((e) => {
          const href = patientHref(patientId, 'exams', { highlight: e.id })
          return `- ${e.examType} (${e.examDate.toISOString().slice(0, 10)}): ver na aba Exames ${href} — laudo/PDF disponível no app`
        })
      : ['- Nenhum laudo com arquivo vinculado listado recentemente.']

    return [
      'NAVEGAÇÃO NO APP (links internos — use markdown [texto](url) nas respostas):',
      ...navLines,
      '',
      'INTEGRAÇÕES / SYNC (somente leitura — não dispara sync):',
      ...linkLines,
      '',
      'LAUDOS COM ARQUIVO (abrir na aba Exames):',
      ...fileLines,
      '',
      'Para abrir laudo: sugira o link da aba Exames com highlight do exame; o usuário abre o PDF no app.',
    ].join('\n')
  }
}
