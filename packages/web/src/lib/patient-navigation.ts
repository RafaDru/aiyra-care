/** Macro-seções do perfil do paciente (Opção A — PWA/RN friendly). */
export type PatientSection = 'overview' | 'clinical' | 'plan' | 'files'

export type PatientTabKey =
  | 'basic'
  | 'timeline'
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
  overview: ['basic', 'timeline', 'personal-documents'],
  clinical: ['growth', 'vaccines', 'medications', 'allergies', 'exams', 'records', 'authorizations', 'diagnoses'],
  plan: ['wallet', 'coverage', 'integrations'],
  files: ['documents'],
}

const TAB_TO_SECTION = new Map<PatientTabKey, PatientSection>()
for (const section of PATIENT_SECTIONS) {
  for (const tab of SECTION_TABS[section]) {
    TAB_TO_SECTION.set(tab, section)
  }
}

export const PATIENT_TAB_KEYS = new Set<string>(TAB_TO_SECTION.keys())

const SECTION_SET = new Set<string>(PATIENT_SECTIONS)

export function isPatientSection(value: string | null): value is PatientSection {
  return value != null && SECTION_SET.has(value)
}

export function isPatientTabKey(value: string | null): value is PatientTabKey {
  return value != null && PATIENT_TAB_KEYS.has(value)
}

export function tabToSection(tab: PatientTabKey): PatientSection {
  return TAB_TO_SECTION.get(tab) ?? 'overview'
}

export function defaultTabForSection(section: PatientSection): PatientTabKey {
  return SECTION_TABS[section][0]
}

export function resolvePatientNav(
  sectionParam: string | null,
  tabParam: string | null,
): { section: PatientSection; tab: PatientTabKey } {
  const tab: PatientTabKey = isPatientTabKey(tabParam) ? tabParam : 'basic'
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

export function buildPatientTabHref(
  patientId: string,
  tab: PatientTabKey,
  extra?: Record<string, string>,
): string {
  const section = tabToSection(tab)
  const params = new URLSearchParams({ section, tab })
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v) params.set(k, v)
    }
  }
  return `/patients/${patientId}?${params.toString()}`
}
