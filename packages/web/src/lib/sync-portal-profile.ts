/**
 * Perfis de etapas de sync — espelha packages/api/src/domain/scraper/sync-portal-profile.ts
 * Manter sincronizado ao adicionar novos portais ou etapas.
 */

export type SyncablePortalType = 'unimed' | 'amil' | 'mater_dei' | 'hermes_pardini'

export interface SyncFetchSubstepDef {
  key: string
  label: string
  warningPattern?: string
}

export interface SyncMainStepDef {
  key: string
  title: string
  aliases?: string[]
}

export interface SyncPortalProfile {
  portalType: SyncablePortalType
  label: string
  mainSteps: SyncMainStepDef[]
  fetchSubsteps: SyncFetchSubstepDef[]
  summary: {
    showExams: boolean
    showMedicalRecords: boolean
    showAuthorizations: boolean
    showBeneficiaries: boolean
    showUnmatchedDependents: boolean
    showWarnings: boolean
  }
}

const COMMON_TAIL: SyncMainStepDef[] = [
  { key: 'importing', title: 'Salvando registros' },
  { key: 'done', title: 'Concluído' },
]

export const SYNC_PORTAL_PROFILES: Record<SyncablePortalType, SyncPortalProfile> = {
  unimed: {
    portalType: 'unimed',
    label: 'Unimed BH',
    mainSteps: [
      { key: 'login', title: 'Autenticando', aliases: ['navigate', 'pending'] },
      {
        key: 'fetch',
        title: 'Buscando dados',
        aliases: ['fetch-plano', 'fetch-extrato', 'fetch-autorizacoes'],
      },
      ...COMMON_TAIL,
    ],
    fetchSubsteps: [
      { key: 'fetch-plano', label: 'Plano' },
      { key: 'fetch-extrato', label: 'Extrato e consultas' },
      { key: 'fetch-autorizacoes', label: 'Autorizações' },
    ],
    summary: {
      showExams: true,
      showMedicalRecords: true,
      showAuthorizations: true,
      showBeneficiaries: false,
      showUnmatchedDependents: false,
      showWarnings: false,
    },
  },
  amil: {
    portalType: 'amil',
    label: 'Amil',
    mainSteps: [
      { key: 'login', title: 'Autenticando', aliases: ['navigate', 'pending'] },
      {
        key: 'fetch',
        title: 'Buscando dados',
        aliases: ['fetch-beneficiarios', 'fetch-plano', 'fetch-autorizacoes', 'fetch-guias', 'fetch-utilizacao'],
      },
      ...COMMON_TAIL,
    ],
    fetchSubsteps: [
      { key: 'fetch-beneficiarios', label: 'Beneficiários' },
      { key: 'fetch-plano', label: 'Plano e carteirinhas' },
      { key: 'fetch-autorizacoes', label: 'Autorizações' },
      { key: 'fetch-guias', label: 'Guias' },
      { key: 'fetch-utilizacao', label: 'Atendimentos (utilização)' },
    ],
    summary: {
      showExams: true,
      showMedicalRecords: true,
      showAuthorizations: true,
      showBeneficiaries: true,
      showUnmatchedDependents: true,
      showWarnings: false,
    },
  },
  mater_dei: {
    portalType: 'mater_dei',
    label: 'Meu Mater Dei',
    mainSteps: [
      { key: 'login', title: 'Autenticando', aliases: ['navigate', 'pending'] },
      {
        key: 'fetch',
        title: 'Buscando dados',
        aliases: ['fetch-extrato', 'fetch-exams', 'fetch-documents', 'fetch-files', 'fetch-catalog'],
      },
      ...COMMON_TAIL,
    ],
    fetchSubsteps: [
      { key: 'fetch-catalog', label: 'Conferência de novidades' },
      { key: 'fetch-extrato', label: 'Atendimentos e cirurgias' },
      { key: 'fetch-exams', label: 'Resultados de exames', warningPattern: 'exame' },
      { key: 'fetch-documents', label: 'Documentos clínicos', warningPattern: 'documento' },
      { key: 'fetch-files', label: 'Laudos e imagens' },
    ],
    summary: {
      showExams: true,
      showMedicalRecords: true,
      showAuthorizations: false,
      showBeneficiaries: false,
      showUnmatchedDependents: false,
      showWarnings: true,
    },
  },
  hermes_pardini: {
    portalType: 'hermes_pardini',
    label: 'Grupo Fleury',
    mainSteps: [
      { key: 'login', title: 'Autenticando', aliases: ['navigate', 'pending'] },
      { key: 'fetch', title: 'Buscando exames', aliases: ['fetch-exams'] },
      ...COMMON_TAIL,
    ],
    fetchSubsteps: [
      { key: 'fetch-exams', label: 'Resultados laboratoriais' },
    ],
    summary: {
      showExams: true,
      showMedicalRecords: false,
      showAuthorizations: false,
      showBeneficiaries: false,
      showUnmatchedDependents: false,
      showWarnings: true,
    },
  },
}

export function getSyncPortalProfile(portalType: SyncablePortalType): SyncPortalProfile {
  return SYNC_PORTAL_PROFILES[portalType]
}

/** Mensagens que indicam login manual no browser — exibir destaque no modal. */
export function isInteractiveLoginMessage(message: string): boolean {
  const m = message.toLowerCase()
  if (
    m.includes('sem browser')
    || m.includes('sem navegador')
    || m.includes('via api')
    || m.includes('via http')
    || m.includes('reutilizada')
    || m.includes('autenticado via api')
    || m.includes('sessão amil salva')
    || m.includes('enviando código de verificação')
  ) {
    return false
  }
  return /chrome|gov\.br|conclua o login|clique em entrar|login manual|abra o chrome|navegador automatizado|grupo fleury|precision care|sms|whatsapp|código|codigo/i.test(m)
}

/** Marcador na mensagem de progresso quando OTP deve ser digitado no app. */
export const FLEURY_OTP_IN_APP_MARKER = '[[fleury_otp_in_app]]'

export function isFleuryOtpInAppMessage(message: string): boolean {
  return message.includes(FLEURY_OTP_IN_APP_MARKER)
}

/** Sync Hermes no portal unificado Grupo Fleury (OTP no Chrome, não senha protocolo). */
export function isFleuryOtpLoginMessage(message: string): boolean {
  if (isFleuryOtpInAppMessage(message)) return false
  const m = message.toLowerCase()
  if (m.includes('senha do protocolo') || m.includes('entrada pardini')) return false
  if (m.includes('enviando código de verificação')) return false
  return /grupo fleury|precision care/.test(m)
    && (/sms|whatsapp|e-mail|email|código|codigo|otp/.test(m) || m.includes('no chrome'))
}

function stepIndexForProfile(
  step: string,
  profile: SyncPortalProfile,
  stepDetails?: Record<string, { status: string }>,
): number {
  const direct = profile.mainSteps.findIndex((s) => s.key === step)
  if (direct >= 0) return direct
  if (step.startsWith('fetch-')) {
    return profile.mainSteps.findIndex((s) => s.key === 'fetch')
  }
  if (stepDetails) {
    if (profile.fetchSubsteps.some((s) => {
      const st = stepDetails[s.key]?.status
      return st === 'running' || st === 'success' || st === 'failed'
    })) {
      return profile.mainSteps.findIndex((s) => s.key === 'fetch')
    }
    if (stepDetails.importing?.status) {
      return profile.mainSteps.findIndex((s) => s.key === 'importing')
    }
  }
  const aliased = profile.mainSteps.findIndex((s) => s.aliases?.includes(step))
  if (aliased >= 0) return aliased
  if (step === 'done' || step === 'error') return profile.mainSteps.length - 1
  return 0
}

export function resolveSyncStepIndex(
  step: string,
  portalType: SyncablePortalType,
  stepDetails?: Record<string, { status: string }>,
): number {
  return stepIndexForProfile(step, getSyncPortalProfile(portalType), stepDetails)
}

export function fetchGroupHasFailure(
  stepDetails: Record<string, { status: string }>,
  profile: SyncPortalProfile,
): boolean {
  return profile.fetchSubsteps.some((s) => stepDetails[s.key]?.status === 'failed')
}

export function resolveSubstepStatus(
  sub: SyncFetchSubstepDef,
  detail: { status: 'running' | 'success' | 'failed'; message: string },
  jobDone: boolean,
  warnings: string[],
): 'running' | 'success' | 'failed' {
  if (detail.status === 'failed') return 'failed'
  if (detail.status === 'success') return 'success'
  if (!jobDone) return 'running'
  if (sub.warningPattern && warnings.some((w) => new RegExp(sub.warningPattern!, 'i').test(w))) {
    return 'failed'
  }
  return 'success'
}

export function mainStepStatus(
  overall: 'running' | 'success' | 'partial' | 'failed',
  currentIndex: number,
  stepIdx: number,
  stepKey: string,
): 'wait' | 'process' | 'finish' | 'error' {
  if (stepKey === 'fetch') {
    if (stepIdx < currentIndex) return 'finish'
    if (stepIdx === currentIndex) {
      if (overall === 'success' || overall === 'partial') return 'finish'
      return 'process'
    }
    return 'wait'
  }
  if (overall === 'failed' && stepIdx === currentIndex) return 'error'
  if (stepIdx < currentIndex) return 'finish'
  if (stepIdx === currentIndex) {
    if (overall === 'failed') return 'error'
    if (overall === 'success' || overall === 'partial') return 'finish'
    return 'process'
  }
  return 'wait'
}
