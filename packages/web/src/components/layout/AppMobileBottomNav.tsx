import {
  AppstoreFilled,
  AppstoreOutlined,
  DashboardFilled,
  DashboardOutlined,
  PhoneFilled,
  PhoneOutlined,
  PlusOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { MainNavKey } from './app-main-nav-items.js'

export type MobileBottomNavKey = MainNavKey | 'services'

const ROUTE_ITEMS: {
  key: MainNavKey
  icon: typeof DashboardOutlined
  filled: typeof DashboardFilled
}[] = [
  { key: '/', icon: DashboardOutlined, filled: DashboardFilled },
  { key: '/family', icon: TeamOutlined, filled: TeamOutlined },
  { key: '/emergency', icon: PhoneOutlined, filled: PhoneFilled },
]

type Props = {
  selectedKey: MobileBottomNavKey | ''
  onNavigate: (path: MainNavKey) => void
  onOpenServices: () => void
  onOpenQuickCapture: () => void
  servicesActive: boolean
}

export function AppMobileBottomNav({
  selectedKey,
  onNavigate,
  onOpenServices,
  onOpenQuickCapture,
  servicesActive,
}: Props) {
  const { t } = useTranslation()
  const labels: Record<MainNavKey | 'services', string> = {
    '/': t('nav.dashboard'),
    '/family': t('nav.yourFamily'),
    '/emergency': t('nav.emergency'),
    '/settings': t('nav.settings'),
    services: t('nav.services'),
  }

  const renderRouteItem = ({ key, icon: Icon, filled: Filled }: (typeof ROUTE_ITEMS)[number]) => {
    const active = selectedKey === key
    const emergency = key === '/emergency'
    const IconCmp = active ? Filled : Icon
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
        <span className="app-mobile-bottom-nav__icon-wrap">
          <IconCmp />
        </span>
        <span className="app-mobile-bottom-nav__label">{labels[key]}</span>
      </button>
    )
  }

  return (
    <nav className="app-mobile-bottom-nav" aria-label={t('nav.main')}>
      {renderRouteItem(ROUTE_ITEMS[0])}
      {renderRouteItem(ROUTE_ITEMS[1])}
      <button
        type="button"
        className="app-mobile-bottom-nav__neri"
        aria-label={t('quickCapture.trigger')}
        onClick={onOpenQuickCapture}
      >
        <span className="app-mobile-bottom-nav__neri-inner">
          <img
            className="app-mobile-bottom-nav__neri-symbol"
            src="/brand/kit-oficial-ananeri/02-simbolo-e-wordmark/ananeri-symbol-heart.svg"
            alt=""
            aria-hidden
          />
          <PlusOutlined className="app-mobile-bottom-nav__neri-plus" />
        </span>
        <span className="app-mobile-bottom-nav__neri-caption">{t('nav.neriCapture')}</span>
      </button>
      {renderRouteItem(ROUTE_ITEMS[2])}
      <button
        type="button"
        className={`app-mobile-bottom-nav__item${
          servicesActive ? ' app-mobile-bottom-nav__item--active' : ''
        }`}
        aria-expanded={servicesActive}
        aria-haspopup="dialog"
        onClick={onOpenServices}
      >
        <span className="app-mobile-bottom-nav__icon-wrap">
          {servicesActive ? <AppstoreFilled /> : <AppstoreOutlined />}
        </span>
        <span className="app-mobile-bottom-nav__label">{labels.services}</span>
      </button>
    </nav>
  )
}