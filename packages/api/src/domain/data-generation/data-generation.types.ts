export const ACCOUNT_DATA_DOMAINS = ['account', 'billing'] as const
export const PATIENT_DATA_DOMAINS = [
  'exams',
  'wallet',
  'timeline',
  'hygiene',
  'documents',
  'measurements',
] as const

export type AccountDataDomain = typeof ACCOUNT_DATA_DOMAINS[number]
export type PatientDataDomain = typeof PATIENT_DATA_DOMAINS[number]
export type DataDomain = AccountDataDomain | PatientDataDomain

export interface DomainGenerationRow {
  patientId: string | null
  domain: string
  generation: string
}

export interface PatientFreshnessDomains {
  [domain: string]: {
    generation: string
  }
}

export interface AccountFreshnessView {
  serverTime: string
  account: {
    generation: string
    domains: PatientFreshnessDomains
  }
  patients: Array<{
    patientId: string
    domains: PatientFreshnessDomains
  }>
}
