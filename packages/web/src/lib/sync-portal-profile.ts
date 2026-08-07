/**
 * Perfis de etapas de sync — espelha packages/api/src/domain/scraper/sync-portal-profile.ts
 * Manter sincronizado ao adicionar novos portais ou etapas.
 */

export type SyncablePortalType = 'unimed' | 'amil' | 'mater_dei'

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
        aliases: ['fetch-beneficiarios', 'fetch-plano', 'fetch-autorizacoes', 'fetch-guias'],
      },
      ...COMMON_TAIL,
    ],
    fetchSubsteps: [
      { key: 'fetch-beneficiarios', label: 'Beneficiários' },
      { key: 'fetch-plano', label: 'Plano e carteirinhas' },
      { key: 'fetch-autorizacoes', label: 'Autorizações' },
      { key: 'fetch-guias', label: 'Guias' },
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
}

export function getSyncPortalProfile(portalType: SyncablePortalType): SyncPortalProfile {
  return SYNC_PORTAL_PROFILES[portalType]
}

/** Mensagens que indicam login manual no browser — exibir destaque no modal. */
export function isInteractiveLoginMessage(message: string): boolean {
  return /chrome|browser|gov\.br|conclua o login|clique em entrar|login manual/i.test(message)
}

function stepIndexForProfile(step: string, profile: SyncPortalProfile): number {
  const direct = profile.mainSteps.findIndex((s) => s.key === step)
  if (direct >= 0) return direct
  const aliased = profile.mainSteps.findIndex((s) => s.aliases?.includes(step))
  if (aliased >= 0) return aliased
  if (step.startsWith('fetch-')) {
    return profile.mainSteps.findIndex((s) => s.key === 'fetch')
  }
  return -1
}

export function resolveSyncStepIndex(step: string, portalType: SyncablePortalType): number {
  return stepIndexForProfile(step, getSyncPortalProfile(portalType))
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
