import type { SyncNoveltySummary } from '../../domain/sync-job/sync-job.entity.js'
import type { CanonicalImportOutcome } from './canonical-batch-importer.service.js'
import type { SyncResult } from '../../infrastructure/scraper/sync-progress-store.js'

export function noveltyFromImportOutcome(
  outcome: CanonicalImportOutcome,
  portalCounts?: { portalExams?: number; portalAttendances?: number },
): SyncNoveltySummary {
  return {
    newAuthorizations: outcome.authorizations,
    updatedAuthorizations: outcome.updatedAuthorizations,
    newMedicalRecords: outcome.medicalRecords,
    newExamRecords: outcome.exams,
    portalExams: portalCounts?.portalExams,
    portalAttendances: portalCounts?.portalAttendances,
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
