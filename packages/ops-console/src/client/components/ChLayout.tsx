import type { ReactNode } from 'react'
import type { OpsDeploymentTier } from '../theme/ops-environment.js'
import type { ChServiceState } from '../ch-service-status.js'
import type { ChGroupId, ChNavGroup, ChNavItem, ChTabKey } from '../ch-navigation.js'
import { ChContextBar } from './ChContextBar.js'
import { ChHeader } from './ChHeader.js'
import { ChSideNav } from './ChSideNav.js'

export function ChLayout({
  group,
  item,
  activeTab,
  deploymentTier,
  webStatus,
  backendStatus,
  headerActions,
  footer,
  tabCounts,
  tabAlert,
  groupAlertCounts,
  mobileNavOpen,
  onOpenMobileNav,
  onCloseMobileNav,
  onSelectGroup,
  onSelectTab,
  children,
}: {
  group: ChNavGroup
  item: ChNavItem
  activeTab: ChTabKey
  deploymentTier: OpsDeploymentTier
  webStatus: ChServiceState
  backendStatus: ChServiceState
  headerActions?: ReactNode
  footer?: ReactNode
  tabCounts?: Partial<Record<ChTabKey, number>>
  tabAlert?: Partial<Record<ChTabKey, boolean>>
  groupAlertCounts?: Partial<Record<ChGroupId, number>>
  mobileNavOpen?: boolean
  onOpenMobileNav?: () => void
  onCloseMobileNav?: () => void
  onSelectGroup: (group: ChGroupId) => void
  onSelectTab: (tab: ChTabKey) => void
  children: ReactNode
}) {
  return (
    <div className="ch-layout">
      <ChHeader
        deploymentTier={deploymentTier}
        webStatus={webStatus}
        backendStatus={backendStatus}
        activeGroup={group.id}
        groupAlertCounts={groupAlertCounts}
        headerActions={headerActions}
        onSelectGroup={onSelectGroup}
      />

      <div
        className="ch-body"
        data-ch-zone={group.id}
        style={{ ['--ch-zone-accent' as string]: group.accent }}
      >
        {mobileNavOpen && onCloseMobileNav && (
          <button
            type="button"
            className="ch-drawer-backdrop"
            aria-label="Fechar menu"
            onClick={onCloseMobileNav}
          />
        )}
        <ChSideNav
          group={group}
          activeTab={activeTab}
          tabCounts={tabCounts}
          tabAlert={tabAlert}
          className={mobileNavOpen ? 'ch-sidenav--drawer-open' : undefined}
          onSelectTab={(tab) => {
            onSelectTab(tab)
            onCloseMobileNav?.()
          }}
        />
        <div className="ch-main-column">
          <ChContextBar group={group} item={item} onOpenMobileNav={onOpenMobileNav} />
          <div className="ch-content-panel">{children}</div>
        </div>
      </div>

      {footer && <footer className="ch-footer">{footer}</footer>}
    </div>
  )
}
