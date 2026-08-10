/** Perfis de etapas de sincronização por portal — contrato de domínio (UI espelha em web). */

export type SyncablePortalType = 'unimed' | 'amil' | 'mater_dei' | 'hermes_pardini'

export interface SyncFetchSubstepDef {
  key: string
  label: string
  /** Regex para inferir falha parcial a partir de warnings quando sub-etapa ficou running. */
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
    label: 'Hermes Pardini',
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

/** Chaves de sub-etapas fetch-* rastreadáveis para um portal. */
export function fetchSubstepKeys(portalType: SyncablePortalType): string[] {
  return SYNC_PORTAL_PROFILES[portalType].fetchSubsteps.map((s) => s.key)
}

/** União de todas as chaves conhecidas (store / validação). */
export function allKnownSyncStepKeys(): string[] {
  const keys = new Set<string>(['login', 'importing', 'done', 'error', 'pending'])
  for (const profile of Object.values(SYNC_PORTAL_PROFILES)) {
    for (const s of profile.mainSteps) keys.add(s.key)
    for (const s of profile.mainSteps) s.aliases?.forEach((a) => keys.add(a))
    for (const s of profile.fetchSubsteps) keys.add(s.key)
  }
  return [...keys]
}
