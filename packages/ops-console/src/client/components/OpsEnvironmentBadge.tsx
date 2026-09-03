import type { OpsDeploymentTier } from '../theme/ops-environment.js'
import { OPS_ENVIRONMENT_LABELS, opsEnvironmentClass } from '../theme/ops-environment.js'

export function OpsEnvironmentBadge({ tier }: { tier: OpsDeploymentTier }) {
  return (
    <div
      className={opsEnvironmentClass(tier)}
      role="status"
      aria-label={OPS_ENVIRONMENT_LABELS[tier]}
    >
      {OPS_ENVIRONMENT_LABELS[tier]}
    </div>
  )
}
