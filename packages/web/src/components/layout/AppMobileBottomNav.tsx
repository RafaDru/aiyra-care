import { useTranslation } from 'react-i18next'
import { AvaAvatar } from '../ava/AvaAvatar.js'
import type { MainNavKey } from './app-main-nav-items.js'
import { AppMobileBottomNavRail } from './AppMobileBottomNavRail.js'
import {
  MobileNavIconEmergency,
  MobileNavIconFamily,
  MobileNavIconHome,
  MobileNavIconServices,
} from './app-mobile-bottom-nav-icons.js'

export type MobileBottomNavKey = MainNavKey | 'services'

const MUTED = 'var(--text-secondary, #64748b)'
const PRIMARY = 'var(--primary, #7e22ce)'
const EMERGENCY = 'var(--emergency-nav, #cf1322)'
const FAMILY_PINK = '#ec4899'

const ROUTE_KEYS: MainNavKey[] = ['/', '/family', '/emergency']

type Props = {
  selectedKey: MobileBottomNavKey | ''
  onNavigate: (path: MainNavKey) => void
  onOpenServices: () => void
  onOpenNeriChat: () => void
  servicesActive: boolean
}

export function AppMobileBottomNav({
  selectedKey,
  onNavigate,
  onOpenServices,
  onOpenNeriChat,
  servicesActive,
}: Props) {
  const { t } = useTranslation()
  const labels: Record<MainNavKey | 'services', string> = {
    '/': t('nav.dashboard'),
    '/family': t('nav.familyCompact'),
    '/emergency': t('nav.emergency'),
    '/settings': t('nav.settings'),
    services: t('nav.services'),
  }

  const renderRouteItem = (key: MainNavKey) => {
    const active = selectedKey === key
    const emergency = key === '/emergency'
    const icon =
      key === '/' ? (
        <MobileNavIconHome active={active} muted={MUTED} primary={PRIMARY} />
      ) : key === '/family' ? (
        <MobileNavIconFamily
          active={active}
          muted={MUTED}
          primary={PRIMARY}
          familyPink={FAMILY_PINK}
        />
      ) : (
        <MobileNavIconEmergency active={active} muted={MUTED} emergency={EMERGENCY} />
      )
    const family = key === '/family'
    return (
      <div key={key} className="app-mobile-bottom-nav__col">
        <button
          type="button"
          className={`app-mobile-bottom-nav__item${active ? ' app-mobile-bottom-nav__item--active' : ''}${
            emergency ? ' app-mobile-bottom-nav__item--emergency' : ''
          }`}
          aria-current={active ? 'page' : undefined}
          onClick={() => onNavigate(key)}
        >
          <span
            className={`app-mobile-bottom-nav__icon-wrap${family ? ' app-mobile-bottom-nav__icon-wrap--family' : ''}`}
          >
            {icon}
          </span>
          <span className="app-mobile-bottom-nav__label">{labels[key]}</span>
        </button>
      </div>
    )
  }

  return (
    <nav className="app-mobile-bottom-nav" data-testid="app-mobile-bottom-nav" aria-label={t('nav.main')}>
      <AppMobileBottomNavRail />
      {renderRouteItem(ROUTE_KEYS[0])}
      {renderRouteItem(ROUTE_KEYS[1])}
      <div className="app-mobile-bottom-nav__col app-mobile-bottom-nav__neri-slot">
        <button
          type="button"
          className="app-mobile-bottom-nav__neri"
          aria-label={t('ava.openChat')}
          onClick={onOpenNeriChat}
        >
          <span className="app-mobile-bottom-nav__neri-inner">
            <AvaAvatar
              size={48}
              className="app-mobile-bottom-nav__neri-avatar"
              expression="present"
              softCrossfade
              crossfadeVariant="lite"
            />
          </span>
          <span className="app-mobile-bottom-nav__neri-caption">{t('nav.neriChat')}</span>
        </button>
      </div>
      {renderRouteItem(ROUTE_KEYS[2])}
      <div className="app-mobile-bottom-nav__col">
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
            <MobileNavIconServices active={servicesActive} muted={MUTED} primary={PRIMARY} />
          </span>
          <span className="app-mobile-bottom-nav__label">{labels.services}</span>
        </button>
      </div>
    </nav>
  )
}