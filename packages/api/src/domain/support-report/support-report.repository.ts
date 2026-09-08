import type {
  CreateSupportReportInput,
  SupportReportAnalysisStatus,
  SupportReportRecord,
} from './support-report.types.js'

export interface SupportReportInsertRow extends CreateSupportReportInput {
  accountId: string
  diagnosticContext: Record<string, unknown>
  profileAccessUntil: Date | null
  expiresAt: Date
}

export interface SupportReportRepository {
  insert(row: SupportReportInsertRow): Promise<SupportReportRecord>
  listByAccount(accountId: string, limit: number): Promise<SupportReportRecord[]>
  findByIdForAccount(id: string, accountId: string): Promise<SupportReportRecord | null>
  fetchRecentProductEvents(accountId: string, sessionId: string | undefined, limit: number): Promise<unknown[]>
  fetchRecentClientErrors(accountId: string, limit: number): Promise<unknown[]>
  fetchLastSyncFailure(patientId: string): Promise<unknown | null>
  updateAnalysisStateForOps(
    id: string,
    patch: {
      analysisStatus: SupportReportAnalysisStatus
      analysisLastError?: string | null
      analysisRequestedAt?: Date | null
      analysisCompletedAt?: Date | null
      analysisSummary?: string | null
      analysisArtifactPath?: string | null
      operatorNotes?: string | null
    },
  ): Promise<boolean>
}
