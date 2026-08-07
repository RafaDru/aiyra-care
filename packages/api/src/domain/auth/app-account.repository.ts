import type { AppAccount } from './app-account.entity.js'

export interface AppAccountRepository {
  findByAuthSubject(authProvider: string, authSubject: string): Promise<AppAccount | null>
  findById(id: string): Promise<AppAccount | null>
  save(account: AppAccount): Promise<AppAccount>
  update(account: AppAccount): Promise<AppAccount>
}

export interface PatientMembershipRepository {
  hasSelfProfile(accountId: string): Promise<boolean>
  ensureMembership(accountId: string, patientId: string, role?: string): Promise<void>
  listAccessiblePatientIds(accountId: string): Promise<string[]>
}
