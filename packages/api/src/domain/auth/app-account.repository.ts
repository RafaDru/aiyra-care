import type { AppAccount } from './app-account.entity.js'

export interface AppAccountRepository {
  findByAuthSubject(authProvider: string, authSubject: string): Promise<AppAccount | null>
  findById(id: string): Promise<AppAccount | null>
  /** Todas as contas com o mesmo e-mail (case-insensitive), ordem estável por created_at. */
  listByEmail(authProvider: string, email: string): Promise<AppAccount[]>
  save(account: AppAccount): Promise<AppAccount>
  update(account: AppAccount): Promise<AppAccount>
  /**
   * Aponta a conta canônica para o auth_subject do Supabase atual, liberando colisão na unique (provider, subject).
   */
  relinkAuthSubject(accountId: string, authProvider: string, authSubject: string): Promise<AppAccount>
  /** Marca conta órfã/duplicada para não colidir no próximo login OAuth. */
  retireAuthSubject(accountId: string): Promise<void>
}

export interface PatientMembershipRepository {
  hasSelfProfile(accountId: string): Promise<boolean>
  /** Paciente titular: membership `self`, ou fallback `patients.owner_account_id`. */
  findSelfPatientId(accountId: string): Promise<string | null>
  ensureMembership(accountId: string, patientId: string, role?: string): Promise<void>
  listAccessiblePatientIds(accountId: string): Promise<string[]>
  listRolesForAccount(accountId: string): Promise<Record<string, string>>
  setSelfPatient(accountId: string, patientId: string): Promise<void>
}
