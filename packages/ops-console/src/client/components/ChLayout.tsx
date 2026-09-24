import type { ReactNode } from 'react'
import type { ChGroupId, ChNavGroup, ChNavItem, ChTabKey } from '../ch-navigation.js'
import { ChContextBar } from './ChContextBar.js'
import { ChSideNav } from './ChSideNav.js'
import { ChTopNav } from './ChTopNav.js'

export function ChLayout({
  group,
  item,
  activeTab,
  envChip,
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
  envChip?: ReactNode
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
      <header className="ch-header">
        <div className="ch-header-brand">
          <div className="ops-logo" aria-hidden>A</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.3 }}>Command Hub</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>AiyraCare · plataforma interna</div>
          </div>
        </div>
        <div className="ch-header-meta">
          {envChip}
          {headerActions}
        </div>
      </header>

      <ChTopNav
        activeGroup={group.id}
        groupAlertCounts={groupAlertCounts}
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
