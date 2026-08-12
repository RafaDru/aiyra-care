import type { SyncNoveltySummary } from '../../domain/sync-job/sync-job.entity.js'
import type { CanonicalImportOutcome } from './canonical-batch-importer.service.js'
import type { SyncResult } from '../../infrastructure/scraper/sync-progress-store.js'

export interface PortalNoveltyCounts {
  portalExams?: number
  portalAttendances?: number
  portalMedicalRecords?: number
  portalAuthorizations?: number
}

export function noveltyFromImportOutcome(
  outcome: CanonicalImportOutcome,
  portalCounts?: PortalNoveltyCounts,
): SyncNoveltySummary {
  const portalMedicalRecords = portalCounts?.portalMedicalRecords
    ?? ((outcome.medicalRecords ?? 0) + (outcome.skippedMedicalRecords ?? 0) || undefined)
  const portalExams = portalCounts?.portalExams
    ?? ((outcome.exams ?? 0) + (outcome.skippedExams ?? 0) || undefined)
  const portalAuthorizations = portalCounts?.portalAuthorizations
    ?? ((outcome.authorizations ?? 0) + (outcome.updatedAuthorizations ?? 0) + (outcome.skippedAuthorizations ?? 0) || undefined)

  return {
    newAuthorizations: outcome.authorizations,
    updatedAuthorizations: outcome.updatedAuthorizations,
    newMedicalRecords: outcome.medicalRecords,
    newExamRecords: outcome.exams,
    skippedMedicalRecords: outcome.skippedMedicalRecords || undefined,
    skippedExamRecords: outcome.skippedExams || undefined,
    skippedAuthorizations: outcome.skippedAuthorizations || undefined,
    portalExams: portalExams || undefined,
    portalAttendances: portalCounts?.portalAttendances,
    portalMedicalRecords: portalMedicalRecords || undefined,
    portalAuthorizations: portalAuthorizations || undefined,
  }
}

export function attachNoveltyToSyncResult(result: SyncResult, novelty: SyncNoveltySummary): SyncResult {
  return { ...result, novelty }
}

export function hasMeaningfulNovelty(n: SyncNoveltySummary | null | undefined): boolean {
  if (!n) return false
  return (
    (n.newAuthorizations ?? 0) > 0
    || (n.updatedAuthorizations ?? 0) > 0
    || (n.newMedicalRecords ?? 0) > 0
    || (n.newExamRecords ?? 0) > 0
    || (n.filesDownloaded ?? 0) > 0
  )
}
