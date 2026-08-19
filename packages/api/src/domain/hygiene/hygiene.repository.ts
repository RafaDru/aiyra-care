import type {
  HygieneCandidate,
  HygieneCandidatePairInput,
  HygieneCandidateStatus,
  HygieneEntityType,
  HygieneResolveDecision,
} from './hygiene.types.js'

export interface HygieneRepository {
  upsertCandidate(input: HygieneCandidatePairInput): Promise<HygieneCandidate | null>
  listForAccount(
    accountId: string,
    opts?: { status?: HygieneCandidateStatus; patientId?: string; limit?: number },
  ): Promise<HygieneCandidate[]>
  findById(id: string): Promise<HygieneCandidate | null>
  resolve(
    id: string,
    decision: HygieneResolveDecision,
    resolvedBy: string,
  ): Promise<HygieneCandidate | null>
  countPending(accountId: string): Promise<number>
}

export interface PatientAccountResolver {
  resolveAccountIdForPatient(patientId: string): Promise<string | null>
}
