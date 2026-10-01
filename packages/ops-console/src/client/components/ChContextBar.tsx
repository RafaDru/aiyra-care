import { Button } from 'antd'
import { MenuOutlined } from '@ant-design/icons'
import type { ChNavGroup, ChNavItem } from '../ch-navigation.js'

export function ChContextBar({
  group,
  item,
  onOpenMobileNav,
}: {
  group: ChNavGroup
  item: ChNavItem
  onOpenMobileNav?: () => void
}) {
  return (
    <div className="ch-context-bar">
      {onOpenMobileNav && (
        <Button
          type="text"
          className="ch-mobile-menu-btn"
          icon={<MenuOutlined />}
          onClick={onOpenMobileNav}
          aria-label="Abrir menu"
        />
      )}
      <div className="ch-context-icon" aria-hidden>{item.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="ch-context-breadcrumb">
          <strong>{group.label}</strong>
          {' › '}
          {item.label}
        </div>
        <h1 className="ch-context-title">{item.label}</h1>
        <p className="ch-context-desc">{item.description}</p>
      </div>
    </div>
  )
}
