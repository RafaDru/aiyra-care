import type { ReactNode } from 'react'
import type { OpsDeploymentTier } from '../theme/ops-environment.js'
import { CH_ENV_CHIP_LABELS, chEnvChipClass } from '../theme/ch-environment.js'
import type { ChGroupId } from '../ch-navigation.js'
import type { ChServiceState } from '../ch-service-status.js'
import { ChHubCareLogo } from './ChHubCareLogo.js'
import { ChServiceStatusPills } from './ChServiceStatusPills.js'
import { ChTopNav } from './ChTopNav.js'

export function ChHeader({
  deploymentTier,
  webStatus,
  backendStatus,
  activeGroup,
  groupAlertCounts,
  headerActions,
  onSelectGroup,
}: {
  deploymentTier: OpsDeploymentTier
  webStatus: ChServiceState
  backendStatus: ChServiceState
  activeGroup: ChGroupId
  groupAlertCounts?: Partial<Record<ChGroupId, number>>
  headerActions?: ReactNode
  onSelectGroup: (group: ChGroupId) => void
}) {
  return (
    <header className="ch-header-shell">
      <div className="ch-header ch-header--primary">
        <div className="ch-header-brand">
          <ChHubCareLogo size={40} />
          <div>
            <div className="ch-header-title">Command Hub Care</div>
            <div className="ch-header-subtitle">Aiyra Care · operação interna</div>
          </div>
        </div>
        <div className="ch-header-meta">
          <span className={chEnvChipClass(deploymentTier)} role="status">
            {CH_ENV_CHIP_LABELS[deploymentTier]}
          </span>
          <ChServiceStatusPills web={webStatus} backend={backendStatus} />
          {headerActions}
        </div>
      </div>
      <div className="ch-header ch-header--command">
        <span className="ch-header-command-label">Central de comando</span>
        <ChTopNav
          activeGroup={activeGroup}
          groupAlertCounts={groupAlertCounts}
          onSelectGroup={onSelectGroup}
        />
      </div>
    </header>
  )
}
