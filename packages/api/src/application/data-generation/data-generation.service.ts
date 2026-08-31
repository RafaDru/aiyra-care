import type { SyncNoveltySummary } from '../../domain/sync-job/sync-job.entity.js'
import type { HygieneEntityType } from '../../domain/hygiene/hygiene.types.js'
import type { PatientMembershipRepository } from '../../domain/auth/app-account.repository.js'
import {
  ACCOUNT_DATA_DOMAINS,
  PATIENT_DATA_DOMAINS,
  type AccountFreshnessView,
  type PatientDataDomain,
  type PatientFreshnessDomains,
} from '../../domain/data-generation/data-generation.types.js'
import type { DataGenerationPgRepository } from '../../infrastructure/persistence/data-generation.pg.repository.js'

export class DataGenerationService {
  constructor(
    private readonly repo: DataGenerationPgRepository,
    private readonly memberships: PatientMembershipRepository,
  ) {}

  async bumpAccount(accountId: string, domain: string): Promise<string> {
    return this.repo.bump(accountId, null, domain)
  }

  async bumpPatient(
    accountId: string,
    patientId: string,
    domains: string[],
  ): Promise<void> {
    const unique = [...new Set(domains)]
    for (const domain of unique) {
      await this.repo.bump(accountId, patientId, domain)
    }
    await this.repo.bump(accountId, patientId, 'timeline')
  }

  async bumpAfterSyncSuccess(
    accountId: string,
    patientId: string,
    novelty?: SyncNoveltySummary | null,
  ): Promise<void> {
    const domains: PatientDataDomain[] = ['wallet', 'timeline']
    const examSignals =
      (novelty?.newExamRecords ?? 0) > 0
      || (novelty?.portalExams ?? 0) > 0
      || (novelty?.filesDownloaded ?? 0) > 0
    if (examSignals) domains.push('exams')
    if ((novelty?.newMedicalRecords ?? 0) > 0 || (novelty?.portalMedicalRecords ?? 0) > 0) {
      domains.push('documents')
    }
    await this.bumpPatient(accountId, patientId, domains)
  }

  async bumpAfterHygieneResolve(
    accountId: string,
    patientId: string,
    entityType: HygieneEntityType,
  ): Promise<void> {
    const domains: PatientDataDomain[] = ['hygiene', 'timeline']
    switch (entityType) {
      case 'exam':
        domains.push('exams')
        break
      case 'medical_record':
        domains.push('documents')
        break
      case 'authorization':
        domains.push('wallet')
        break
      default:
        break
    }
    await this.bumpPatient(accountId, patientId, domains)
  }

  async getPatientGeneration(
    accountId: string,
    patientId: string,
    domain: string,
  ): Promise<string | null> {
    return this.repo.getGeneration(accountId, patientId, domain)
  }

  async getAccountFreshness(accountId: string): Promise<AccountFreshnessView> {
    const rows = await this.repo.listForAccount(accountId)
    const accountDomains: PatientFreshnessDomains = {}
    const byPatient = new Map<string, PatientFreshnessDomains>()

    for (const row of rows) {
      if (!row.patientId) {
        accountDomains[row.domain] = { generation: row.generation }
        continue
      }
      let map = byPatient.get(row.patientId)
      if (!map) {
        map = {}
        byPatient.set(row.patientId, map)
      }
      map[row.domain] = { generation: row.generation }
    }

    const membershipIds = await this.memberships.listAccessiblePatientIds(accountId)
    const patients = membershipIds.map((patientId) => ({
      patientId,
      domains: byPatient.get(patientId) ?? {},
    }))

    const accountGeneration = accountDomains.account?.generation
      ?? accountDomains.billing?.generation
      ?? new Date(0).toISOString()

    return {
      serverTime: new Date().toISOString(),
      account: {
        generation: accountGeneration,
        domains: accountDomains,
      },
      patients,
    }
  }

  static allDomainNames(): string[] {
    return [...ACCOUNT_DATA_DOMAINS, ...PATIENT_DATA_DOMAINS]
  }
}
