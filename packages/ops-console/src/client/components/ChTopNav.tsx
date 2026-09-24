import { CH_NAV_GROUPS, type ChGroupId } from '../ch-navigation.js'

export function ChTopNav({
  activeGroup,
  groupAlertCounts,
  onSelectGroup,
}: {
  activeGroup: ChGroupId
  groupAlertCounts?: Partial<Record<ChGroupId, number>>
  onSelectGroup: (group: ChGroupId) => void
}) {
  return (
    <nav className="ch-topnav" aria-label="Áreas de comando">
      <ul className="ch-topnav-list">
        {CH_NAV_GROUPS.map((g) => {
          const alertCount = groupAlertCounts?.[g.id] ?? 0
          const active = g.id === activeGroup
          return (
            <li key={g.id} className="ch-topnav-item">
              <button
                type="button"
                className={`ch-topnav-btn${active ? ' ch-topnav-btn--active' : ''}`}
                style={active ? { ['--ch-zone-accent' as string]: g.accent } : undefined}
                onClick={() => onSelectGroup(g.id)}
                aria-current={active ? 'true' : undefined}
              >
                <span aria-hidden>{g.icon}</span>
                {g.label}
                {alertCount > 0 && (
                  <span className="ch-topnav-badge" title="Itens com atenção">
                    {alertCount > 9 ? '9+' : alertCount}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
