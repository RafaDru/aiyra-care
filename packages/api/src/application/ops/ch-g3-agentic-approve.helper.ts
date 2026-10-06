import type { PlatformDefectRecord } from '../../domain/ops/platform-defect.types.js'
import {
  isChG3AgenticAutoApproveEnabled,
  isChPrReviewRequireCiGreenEnabled,
} from './defect-ci-pipeline.config.js'

export type G3AgenticApproveSkipReason =
  | 'flag_disabled'
  | 'review_failed'
  | 'recommendation_not_approve'
  | 'invalid_defect_status'
  | 'already_approved'
  | 'ci_not_green'

export type G3AgenticApproveEligibility =
  | { eligible: true }
  | { eligible: false; reason: G3AgenticApproveSkipReason }

function ciSnapshotIndicatesSuccess(ciSnapshot: Record<string, unknown> | null | undefined): boolean {
  if (!ciSnapshot) return false
  const status = String(ciSnapshot.status ?? '').toLowerCase()
  const conclusion = String(ciSnapshot.conclusion ?? '').toLowerCase()
  return status === 'success' || conclusion === 'success'
}

export function evaluateG3AgenticApproveEligibility(
  defect: PlatformDefectRecord,
  input: {
    reviewStatus: 'completed' | 'failed'
    recommendation?: string | null
    ciSnapshot?: Record<string, unknown> | null
  },
  env: NodeJS.ProcessEnv = process.env,
): G3AgenticApproveEligibility {
  if (!isChG3AgenticAutoApproveEnabled(env)) {
    return { eligible: false, reason: 'flag_disabled' }
  }
  if (input.reviewStatus === 'failed') {
    return { eligible: false, reason: 'review_failed' }
  }
  if (input.recommendation !== 'approve') {
    return { eligible: false, reason: 'recommendation_not_approve' }
  }
  if (defect.status !== 'ready_for_pr') {
    return { eligible: false, reason: 'invalid_defect_status' }
  }
  if (defect.operatorPrApprovedAt) {
    return { eligible: false, reason: 'already_approved' }
  }
  if (isChPrReviewRequireCiGreenEnabled(env)) {
    const pipelineOk = defect.pipelineStatus === 'ci_success'
    const snapshotOk = ciSnapshotIndicatesSuccess(input.ciSnapshot)
    if (!pipelineOk && !snapshotOk) {
      return { eligible: false, reason: 'ci_not_green' }
    }
  }
  return { eligible: true }
}

export const G3_AGENTIC_OPERATOR_NOTE = '[agentic] auto after review approve'
