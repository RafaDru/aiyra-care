/** Post-ready_for_pr CI/review pipeline — migration 086 / CH_CYCLE_CLOSE_SPEC §4. */
export type DefectPipelineStatus =
  | 'ci_pending'
  | 'ci_running'
  | 'ci_failed'
  | 'ci_success'
  | 'review_pending'
  | 'review_failed'
  | 'approved_for_merge'

export type DefectPipelineFailureDetails = Record<string, unknown>
