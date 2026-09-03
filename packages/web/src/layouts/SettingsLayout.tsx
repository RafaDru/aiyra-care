import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Menu } from 'antd'
import type { MenuProps } from 'antd'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../components/ui/PageHeader.js'
import { SETTINGS_PATHS } from '../lib/settings-paths.js'

const NAV_KEYS = [
  SETTINGS_PATHS.general,
  SETTINGS_PATHS.account,
  SETTINGS_PATHS.family,
  SETTINGS_PATHS.plan,
  SETTINGS_PATHS.legal,
] as const

export function SettingsLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()

  const selected =
    NAV_KEYS.find((key) => location.pathname === key || location.pathname.startsWith(`${key}/`)) ??
    SETTINGS_PATHS.general

  const items: MenuProps['items'] = [
    { key: SETTINGS_PATHS.general, label: t('settings.nav.general') },
    { key: SETTINGS_PATHS.account, label: t('settings.nav.account') },
    { key: SETTINGS_PATHS.family, label: t('settings.nav.family') },
    { key: SETTINGS_PATHS.plan, label: t('settings.nav.plan') },
    { key: SETTINGS_PATHS.legal, label: t('settings.nav.legal') },
  ]

  return (
    <div>
      <PageHeader title={t('nav.settings')} subtitle={t('settings.subtitle')} />
      <Menu
        mode="horizontal"
        selectedKeys={[selected]}
        items={items}
        onClick={({ key }) => navigate(key)}
        style={{ marginBottom: 24 }}
      />
      <div style={{ maxWidth: 560 }}>
        <Outlet />
      </div>
    </div>
  )
}
