import { suggestDefectStatusFilter } from '../../domain/ops/defect-board-filter.js'
import type { PlatformDefectRecord } from '../../domain/ops/platform-defect.types.js'
import type { DefectPrReviewSummary } from '../../domain/ops/defect-pr-review.types.js'
import { resolveDeploymentTier } from '../../domain/ops/investigator-environment.js'
import {
  publishDefectBoardChange,
  type DefectBoardChangeEvent,
} from '../../infrastructure/ops/platform-defect-board.bus.js'

export function buildDefectBoardChangeEvent(
  defect: PlatformDefectRecord,
  latestReview?: DefectPrReviewSummary | null,
  deploymentTier = resolveDeploymentTier(),
): DefectBoardChangeEvent {
  return {
    deploymentTier,
    defectId: defect.id,
    referenceCode: defect.referenceCode,
    status: defect.status,
    updatedAt: defect.updatedAt,
    latestReview: latestReview
      ? {
          status: latestReview.status,
          recommendation: latestReview.recommendation ?? null,
        }
      : latestReview === null
        ? null
        : undefined,
    suggestedStatusFilter: suggestDefectStatusFilter(defect.status),
  }
}

export function notifyDefectBoardFromRecord(
  defect: PlatformDefectRecord,
  latestReview?: DefectPrReviewSummary | null,
): void {
  publishDefectBoardChange(buildDefectBoardChangeEvent(defect, latestReview))
}
