import {
  DashboardOutlined,
  PhoneOutlined,
  SettingOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { MainNavKey } from './app-main-nav-items.js'

const ITEMS: { key: MainNavKey; icon: typeof DashboardOutlined }[] = [
  { key: '/', icon: DashboardOutlined },
  { key: '/family', icon: TeamOutlined },
  { key: '/emergency', icon: PhoneOutlined },
  { key: '/settings', icon: SettingOutlined },
]

type Props = {
  selectedKey: MainNavKey | ''
  onNavigate: (path: MainNavKey) => void
}

export function AppMobileBottomNav({ selectedKey, onNavigate }: Props) {
  const { t } = useTranslation()
  const labels: Record<MainNavKey, string> = {
    '/': t('nav.dashboard'),
    '/family': t('nav.yourFamily'),
    '/emergency': t('nav.emergency'),
    '/settings': t('nav.settings'),
  }

  return (
    <nav className="app-mobile-bottom-nav" aria-label={t('nav.main')}>
      {ITEMS.map(({ key, icon: Icon }) => {
        const active = selectedKey === key
        const emergency = key === '/emergency'
        return (
          <button
            key={key}
            type="button"
            className={`app-mobile-bottom-nav__item${active ? ' app-mobile-bottom-nav__item--active' : ''}${
              emergency ? ' app-mobile-bottom-nav__item--emergency' : ''
            }`}
            aria-current={active ? 'page' : undefined}
            onClick={() => onNavigate(key)}
          >
            <Icon />
            <span>{labels[key]}</span>
          </button>
        )
      })}
    </nav>
  )
}