import {
  AppstoreFilled,
  AppstoreOutlined,
  DashboardFilled,
  DashboardOutlined,
  PhoneFilled,
  PhoneOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { MainNavKey } from './app-main-nav-items.js'

const NERI_TILE =
  '/brand/kit-oficial-ananeri/04-app-icons-e-favicons/neri-agent-tile-rounded.svg'

export type CompactBottomNavKey = MainNavKey | 'services'

type SideItem = {
  key: MainNavKey
  icon: typeof DashboardOutlined
  filledIcon: typeof DashboardOutlined
}

const LEFT: SideItem[] = [
  { key: '/', icon: DashboardOutlined, filledIcon: DashboardFilled },
  { key: '/family', icon: TeamOutlined, filledIcon: TeamOutlined },
]

const RIGHT: SideItem[] = [
  { key: '/emergency', icon: PhoneOutlined, filledIcon: PhoneFilled },
]

type Props = {
  selectedKey: CompactBottomNavKey | ''
  onNavigate: (path: MainNavKey) => void
  onNeriPress: () => void
  onServicesPress: () => void
}

function SideTab({
  item,
  label,
  active,
  emergency,
  onPress,
}: {
  item: SideItem
  label: string
  active: boolean
  emergency?: boolean
  onPress: () => void
}) {
  const Icon = active ? item.filledIcon : item.icon
  return (
    <button
      type="button"
      className={`app-mobile-bottom-nav__item${active ? ' app-mobile-bottom-nav__item--active' : ''}${
        emergency ? ' app-mobile-bottom-nav__item--emergency' : ''
      }`}
      aria-current={active ? 'page' : undefined}
      onClick={onPress}
    >
      <span className={`app-mobile-bottom-nav__icon-wrap${active ? ' app-mobile-bottom-nav__icon-wrap--active' : ''}`}>
        <Icon />
      </span>
      <span className="app-mobile-bottom-nav__label">{label}</span>
    </button>
  )
}

export function AppMobileBottomNav({
  selectedKey,
  onNavigate,
  onNeriPress,
  onServicesPress,
}: Props) {
  const { t } = useTranslation()
  const labels: Record<MainNavKey, string> = {
    '/': t('nav.dashboard'),
    '/family': t('nav.yourFamily'),
    '/emergency': t('nav.emergency'),
    '/settings': t('nav.settings'),
  }

  const servicesActive = selectedKey === 'services'

  return (
    <nav className="app-mobile-bottom-nav" aria-label={t('nav.main')}>
      {LEFT.map((item) => (
        <SideTab
          key={item.key}
          item={item}
          label={labels[item.key]}
          active={selectedKey === item.key}
          onPress={() => onNavigate(item.key)}
        />
      ))}

      <div className="app-mobile-bottom-nav__center" aria-hidden="false">
        <button
          type="button"
          className="app-mobile-bottom-nav__neri"
          aria-label={t('quickCapture.neriTabA11y')}
          onClick={onNeriPress}
        >
          <img src={NERI_TILE} alt="" width={52} height={52} draggable={false} />
        </button>
      </div>

      {RIGHT.map((item) => (
        <SideTab
          key={item.key}
          item={item}
          label={labels[item.key]}
          active={selectedKey === item.key}
          emergency
          onPress={() => onNavigate(item.key)}
        />
      ))}

      <button
        type="button"
        className={`app-mobile-bottom-nav__item app-mobile-bottom-nav__item--services${
          servicesActive ? ' app-mobile-bottom-nav__item--active' : ''
        }`}
        aria-current={servicesActive ? 'page' : undefined}
        onClick={onServicesPress}
      >
        <span
          className={`app-mobile-bottom-nav__icon-wrap${
            servicesActive ? ' app-mobile-bottom-nav__icon-wrap--active' : ''
          }`}
        >
          {servicesActive ? <AppstoreFilled /> : <AppstoreOutlined />}
        </span>
        <span className="app-mobile-bottom-nav__label">{t('nav.services')}</span>
      </button>
    </nav>
  )
}