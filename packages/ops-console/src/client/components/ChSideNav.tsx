import type { ChGroupId, ChNavGroup, ChTabKey } from '../ch-navigation.js'

export function ChSideNav({
  group,
  activeTab,
  tabCounts,
  tabAlert,
  className,
  onSelectTab,
}: {
  group: ChNavGroup
  activeTab: ChTabKey
  tabCounts?: Partial<Record<ChTabKey, number>>
  tabAlert?: Partial<Record<ChTabKey, boolean>>
  className?: string
  onSelectTab: (tab: ChTabKey) => void
}) {
  return (
    <aside
      className={`ch-sidenav${className ? ` ${className}` : ''}`}
      style={{ ['--ch-zone-accent' as string]: group.accent }}
      aria-label={`Menu ${group.label}`}
    >
      <div className="ch-sidenav-head">
        <div className="ch-sidenav-head-title">
          <span aria-hidden>{group.icon}</span>
          {group.label}
        </div>
      </div>
      <ul className="ch-sidenav-list">
        {group.items.map((item) => {
          const count = tabCounts?.[item.tab]
          const active = item.tab === activeTab
          const alert = tabAlert?.[item.tab]
          return (
            <li key={item.tab}>
              <button
                type="button"
                className={`ch-sidenav-btn${active ? ' ch-sidenav-btn--active' : ''}`}
                onClick={() => onSelectTab(item.tab)}
                aria-current={active ? 'page' : undefined}
              >
                <span aria-hidden>{item.icon}</span>
                {item.label}
                {count != null && count > 0 && (
                  <span
                    className={`ch-sidenav-count${alert ? ' ch-sidenav-count--alert' : ''}`}
                  >
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
