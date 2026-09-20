/** Mirrors packages/web/src/lib/patient-navigation.ts for RN parity. */
export type PatientSection = 'overview' | 'clinical' | 'plan' | 'files'

export type PatientTabKey =
  | 'basic'
  | 'timeline'
  | 'agenda'
  | 'personal-documents'
  | 'wallet'
  | 'coverage'
  | 'integrations'
  | 'growth'
  | 'vaccines'
  | 'medications'
  | 'allergies'
  | 'exams'
  | 'records'
  | 'authorizations'
  | 'diagnoses'
  | 'documents'

export const PATIENT_SECTIONS: PatientSection[] = ['overview', 'clinical', 'plan', 'files']

export const SECTION_TABS: Record<PatientSection, PatientTabKey[]> = {
  overview: ['basic', 'agenda', 'personal-documents'],
  clinical: ['growth', 'vaccines', 'medications', 'allergies', 'exams', 'records', 'authorizations', 'diagnoses'],
  plan: ['wallet', 'coverage', 'integrations'],
  files: ['documents'],
}

export const SECTION_LABELS: Record<PatientSection, string> = {
  overview: 'Visão geral',
  clinical: 'Clínico',
  plan: 'Plano',
  files: 'Arquivos',
}

export const TAB_LABELS: Record<PatientTabKey, string> = {
  basic: 'Dados',
  timeline: 'Linha do tempo',
  agenda: 'Agenda',
  'personal-documents': 'Documentos pessoais',
  wallet: 'Carteira',
  coverage: 'Convênios',
  integrations: 'Integrações',
  growth: 'Crescimento',
  vaccines: 'Vacinas',
  medications: 'Medicamentos',
  allergies: 'Alergias',
  exams: 'Exames',
  records: 'Atendimentos',
  authorizations: 'Autorizações',
  diagnoses: 'Diagnósticos',
  documents: 'Documentos',
}

const TAB_TO_SECTION = new Map<PatientTabKey, PatientSection>()
for (const section of PATIENT_SECTIONS) {
  for (const tab of SECTION_TABS[section]) {
    TAB_TO_SECTION.set(tab, section)
  }
}

export const PATIENT_TAB_KEYS = new Set<string>(TAB_TO_SECTION.keys())

export function isPatientSection(value: string | null | undefined): value is PatientSection {
  return value != null && (PATIENT_SECTIONS as string[]).includes(value)
}

export function isPatientTabKey(value: string | null | undefined): value is PatientTabKey {
  return value != null && PATIENT_TAB_KEYS.has(value)
}

export function tabToSection(tab: PatientTabKey): PatientSection {
  return TAB_TO_SECTION.get(tab) ?? 'overview'
}

export function defaultTabForSection(section: PatientSection): PatientTabKey {
  return SECTION_TABS[section][0]
}

export function resolvePatientNav(
  sectionParam: string | null | undefined,
  tabParam: string | null | undefined,
): { section: PatientSection; tab: PatientTabKey } {
  let tab: PatientTabKey
  if (isPatientTabKey(tabParam)) {
    tab = tabParam
  } else {
    tab = 'basic'
  }
  let section: PatientSection
  if (isPatientSection(sectionParam)) {
    section = sectionParam
  } else {
    section = tabToSection(tab)
  }
  const allowed = SECTION_TABS[section]
  const resolvedTab = allowed.includes(tab) ? tab : allowed[0]
  return { section, tab: resolvedTab }
}
