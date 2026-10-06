import type { PlatformDefectRecord } from '../../src/domain/ops/platform-defect.types.js'

/** Pipeline fields (mig 086) — defaults for unit tests. */
export const platformDefectPipelineDefaults: Pick<
  PlatformDefectRecord,
  | 'pipelineStatus'
  | 'lastFailureDetails'
  | 'lastCiRunUrl'
  | 'lastCiSnapshot'
  | 'lastCiCheckedAt'
> = {
  pipelineStatus: null,
  lastFailureDetails: null,
  lastCiRunUrl: null,
  lastCiSnapshot: null,
  lastCiCheckedAt: null,
}
