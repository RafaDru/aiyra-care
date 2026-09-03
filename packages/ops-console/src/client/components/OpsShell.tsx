import type { ReactNode } from 'react'
import { Space, Typography } from 'antd'
import type { OpsDeploymentTier } from '../theme/ops-environment.js'
import { OpsEnvironmentBadge } from './OpsEnvironmentBadge.js'

const { Title, Text } = Typography

export function OpsShell({
  title,
  subtitle,
  deploymentTier,
  actions,
  statusStrip,
  children,
}: {
  title: string
  subtitle: string
  deploymentTier?: OpsDeploymentTier
  actions?: ReactNode
  statusStrip?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="ops-shell">
      {deploymentTier && (
        <div className="ops-env-banner" aria-hidden={false}>
          <OpsEnvironmentBadge tier={deploymentTier} />
        </div>
      )}
      <header className="ops-header">
        <div className="ops-header-brand">
          <div className="ops-logo" aria-hidden>A</div>
          <div>
            <Title level={4} style={{ margin: 0, lineHeight: 1.3 }}>{title}</Title>
            <Text type="secondary" style={{ fontSize: 13 }}>{subtitle}</Text>
          </div>
        </div>
        {actions && <Space wrap>{actions}</Space>}
      </header>
      {statusStrip && <div className="ops-status-strip">{statusStrip}</div>}
      <main className="ops-main">{children}</main>
    </div>
  )
}
