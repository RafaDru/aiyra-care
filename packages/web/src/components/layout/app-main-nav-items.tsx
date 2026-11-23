import { Badge } from 'antd'
import type { MenuProps } from 'antd'
import {
  DashboardOutlined,
  PhoneOutlined,
  SettingOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import type { TFunction } from 'i18next'

export type MainNavKey = '/' | '/family' | '/emergency' | '/settings'

export function buildMainNavItems(options: {
  t: TFunction
  familyPendingCount: number
  showFamilyPendingBadge: boolean
}): MenuProps['items'] {
  const { t, familyPendingCount, showFamilyPendingBadge } = options
  return [
    { key: '/', icon: <DashboardOutlined />, label: t('nav.dashboard') },
    {
      key: '/family',
      icon: <TeamOutlined />,
      label: (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%' }}>
          <span>{t('nav.yourFamily')}</span>
          {showFamilyPendingBadge && familyPendingCount > 0 && (
            <Badge
              count={familyPendingCount}
              size="small"
              title={t('family.sidebar.pending', { count: familyPendingCount })}
            />
          )}
        </span>
      ),
    },
    {
      key: '/emergency',
      icon: <PhoneOutlined />,
      label: t('nav.emergency'),
      style: { color: 'var(--emergency-nav, #cf1322)', fontWeight: 600 },
    },
    { key: '/settings', icon: <SettingOutlined />, label: t('nav.settings') },
  ]
}