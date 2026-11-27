import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Button, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import {
  LogoutOutlined,
  UserOutlined,
  CustomerServiceOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext.js'
import { useTheme } from '../../theme/ThemeProvider.js'
import { AppLogo } from '../brand/AppLogo.js'
import { LanguageSwitcher } from '../ui/LanguageSwitcher.js'
import { ThemeSwitcher } from '../ui/ThemeSwitcher.js'
import { AvaGlobalDock } from '../ava/AvaGlobalDock.js'
import { HygieneLoginPrompt } from '../hygiene/HygieneLoginPrompt.js'
import { RuntimeDegradedBanner } from '../ops/RuntimeDegradedBanner.js'
import { SupportReportModal } from '../support/SupportReportModal.js'
import { QuickCaptureGlobal } from '../quick-capture/QuickCaptureGlobal.js'
import { requestQuickCaptureOpen } from '../../lib/quick-capture-bus.js'
import { HeaderOrderRequestsMenu } from './HeaderOrderRequestsMenu.js'
import { PatientConsultVisitHost } from '../patient/PatientConsultVisitHost.js'
import { SUPPORT_CENTER_PATH } from '../../lib/support-center-path.js'
import { useScreenTelemetry } from '../../lib/telemetry/use-screen-telemetry.js'
import { FirstVisitTourDrawer } from '../onboarding/FirstVisitTourDrawer.js'
import { DeploymentEnvironmentBadge } from './DeploymentEnvironmentBadge.js'
import { ActiveCareCircleProvider } from '../../contexts/ActiveCareCircleContext.js'
import { CareCircleGlobalSelector } from '../family/CareCircleGlobalSelector.js'
import { useFamilyPendingCount } from '../../hooks/useFamilyPendingCount.js'
import { useCompactAppShell } from '../../hooks/useCompactAppShell.js'
import { buildMainNavItems, type MainNavKey } from './app-main-nav-items.js'
import { AppMobileBottomNav, type MobileBottomNavKey } from './AppMobileBottomNav.js'
import { AppMobileServicesSheet } from './AppMobileServicesSheet.js'
import { AppMobileCaptureFabStack } from './AppMobileCaptureFabStack.js'
import { useAvaPatientLens } from '../ava/useAvaPatientLens.js'
import { requestAvaOpen } from '../../lib/ava-dock-bus.js'
import {
  CompactPatientChromeProvider,
  useCompactPatientChrome,
} from '../../contexts/CompactPatientChromeContext.js'
import { useDesignPreviewMode } from '../../contexts/DesignPreviewModeContext.js'
import { DESIGN_PATIENT_CHROME_PATH } from '../../lib/design-preview-env.js'
import { chromeHeaderPhase, chromeMacroPhase } from '../../lib/patient-chrome-phases.js'

const { Sider, Content, Header } = Layout

const PATIENT_FOCUS_PATH = /^\/patients\/[^/]+/

export function AppLayout() {
  return (
    <ActiveCareCircleProvider>
      <CompactPatientChromeProvider>
        <AppLayoutFrame />
      </CompactPatientChromeProvider>
    </ActiveCareCircleProvider>
  )
}

function AppLayoutFrame() {
  const [collapsed, setCollapsed] = useState(false)
  const [servicesSheetOpen, setServicesSheetOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const designPreview = useDesignPreviewMode()
  const compactShell = useCompactAppShell()
  const { progress: chromeProgress, patientFocus, setChrome, resetChrome } = useCompactPatientChrome()
  const { patientId: avaPatientId } = useAvaPatientLens()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { configured, user, signOut } = useAuth()
  const shellActive = (configured && Boolean(user)) || designPreview
  const { darkMode } = useTheme()
  const familyPendingCount = useFamilyPendingCount(configured && Boolean(user))
  useScreenTelemetry()

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'help',
      icon: <QuestionCircleOutlined />,
      label: t('nav.help'),
      onClick: () => navigate(SUPPORT_CENTER_PATH),
    },
    {
      key: 'sign-out',
      icon: <LogoutOutlined />,
      label: t('auth.signOut'),
      danger: true,
      onClick: () => signOut(),
    },
  ]

  const mainSelectedKey: MainNavKey | '' =
    location.pathname === '/' || location.pathname.startsWith('/patients')
      ? '/'
      : location.pathname.startsWith('/family')
        ? '/family'
        : location.pathname.startsWith('/emergency')
          ? '/emergency'
          : location.pathname.startsWith('/settings')
            ? '/settings'
            : ''

  const mainNavItems = buildMainNavItems({
    t,
    familyPendingCount,
    showFamilyPendingBadge: !collapsed || compactShell,
  })

  const mobileBottomSelectedKey: MobileBottomNavKey | '' = location.pathname.startsWith('/settings')
    ? 'services'
    : mainSelectedKey

  const servicesNavActive = servicesSheetOpen || location.pathname.startsWith('/settings')

  const patientFocusRoute =
    PATIENT_FOCUS_PATH.test(location.pathname) ||
    (designPreview && location.pathname.startsWith(DESIGN_PATIENT_CHROME_PATH))

  useEffect(() => {
    if (!compactShell || !patientFocusRoute) {
      resetChrome()
    }
  }, [compactShell, patientFocusRoute, location.pathname, resetChrome])

  useEffect(() => {
    if (!compactShell || !patientFocusRoute || designPreview) return

    const onScroll = () => {
      const scrollTop = window.scrollY
      const raw = Math.min(1, Math.max(0, scrollTop / 152))
      const eased = raw * raw * (3 - 2 * raw)
      setChrome({ progress: eased, patientFocus: true })
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [compactShell, patientFocusRoute, location.pathname, setChrome, designPreview])

  const chromeLevel =
    compactShell && patientFocus && chromeProgress > 0.12 ? 'app-layout--patient-chrome' : ''
  const chromeExpanded =
    compactShell && patientFocus && chromeProgress <= 0.18 ? 'app-layout--patient-chrome-expanded' : ''
  const navDense = compactShell && chromeProgress > 0.58 ? 'app-layout--bottom-nav-dense' : ''

  const layout = (
    <Layout
      className={
        compactShell
          ? `app-layout app-layout--compact app-layout--neri-fab-refinement ${chromeLevel} ${chromeExpanded} ${navDense}${designPreview ? ' design-preview-viewport' : ''}`.trim()
          : 'app-layout'
      }
      style={
        compactShell
          ? ({
              '--patient-chrome-p': chromeProgress,
              '--patient-chrome-p-macro': chromeMacroPhase(chromeProgress),
              '--patient-chrome-p-header': chromeHeaderPhase(chromeProgress),
              minHeight: '100vh',
            } as CSSProperties)
          : { minHeight: '100vh', height: '100vh', overflow: 'hidden' }
      }
    >
      {!compactShell && (
      <Sider
        className="app-sider"
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        collapsedWidth={80}
        theme={darkMode ? 'dark' : 'light'}
        width={220}
        style={{
          borderRight: '1px solid var(--sidebar-border)',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        <div
          className="app-sider-brand"
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: collapsed ? '8px 6px' : '8px 12px',
          }}
        >
          {collapsed ? (
            <AppLogo variant="stacked" height={44} style={{ maxWidth: 56 }} />
          ) : (
            <AppLogo variant="sidebar" style={{ maxWidth: '100%' }} />
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
          <Menu
            mode="inline"
            selectedKeys={[mainSelectedKey]}
            items={mainNavItems}
            onClick={({ key }) => navigate(key)}
            style={{ borderRight: 0, background: 'transparent' }}
          />

          <div style={{ flex: 1 }} />

          <div
            className={`app-sider-footer${collapsed ? ' app-sider-footer--collapsed' : ''}`}
          >
            {configured && user && (
              <Button
                type="text"
                danger
                className="app-sider-footer__logout"
                icon={<LogoutOutlined />}
                onClick={() => signOut()}
              >
                {!collapsed && t('auth.signOut')}
              </Button>
            )}
            <Button
              type="text"
              className="app-sider-footer__collapse"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              aria-label={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
              onClick={() => setCollapsed(!collapsed)}
            />
          </div>
        </div>
      </Sider>
      )}
      <Layout
        style={
          compactShell
            ? { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'visible' }
            : { flex: 1, minHeight: 0, overflow: 'hidden' }
        }
      >
        <Header
          className={compactShell ? 'app-header app-header--compact-brand' : 'app-header'}
          style={{
            background: compactShell ? undefined : 'var(--card-bg)',
            padding: compactShell ? undefined : '0 24px',
            borderBottom: compactShell ? undefined : '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            height: 64,
            gap: 16,
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <div
            className={compactShell ? 'app-header__brand app-header__brand--compact' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginRight: 'auto',
              flexWrap: compactShell ? 'nowrap' : 'wrap',
              minWidth: 0,
            }}
          >
            {compactShell ? (
              <>
                <span className="app-header__heart-orb" aria-hidden />
                <span className="app-header__lockup-wrap">
                  <AppLogo
                    variant="horizontal"
                    height={36}
                    className="app-header__lockup-full"
                    style={{ maxWidth: 168 }}
                  />
                </span>
                <div
                  id="app-header-patient-ctx-slot"
                  className="app-header__patient-ctx-slot"
                  data-testid="app-header-patient-ctx-slot"
                />
              </>
            ) : (
              collapsed && <AppLogo variant="wordmark" height={38} />
            )}
            {configured && user && !patientFocusRoute && <CareCircleGlobalSelector />}
            {!compactShell && <DeploymentEnvironmentBadge />}
          </div>
          {!compactShell && (
            <div className="app-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {configured && user && <HeaderOrderRequestsMenu />}
              {configured && user && (
                <Button
                  type="text"
                  icon={<CustomerServiceOutlined />}
                  aria-label={t('support.reportButton')}
                  onClick={() => setSupportOpen(true)}
                >
                  {t('support.reportButton')}
                </Button>
              )}
              {configured && user && (
                <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
                  <Button type="text" icon={<UserOutlined />} aria-label={user.email ?? t('auth.account')}>
                    {user.email ?? t('auth.account')}
                  </Button>
                </Dropdown>
              )}
              <ThemeSwitcher />
              <LanguageSwitcher />
            </div>
          )}
        </Header>
        <Content
          ref={contentRef}
          className="app-main-content"
          style={
            compactShell
              ? { flex: 'none', minHeight: 'auto', overflow: 'visible' }
              : { margin: 24, flex: 1, minHeight: 0, overflow: 'auto', overflowX: 'hidden' }
          }
        >
          {configured && user && <RuntimeDegradedBanner />}
          {configured && user && <HygieneLoginPrompt />}
          <Outlet />
        </Content>
      </Layout>
      {compactShell && shellActive && (
        <AppMobileBottomNav
          selectedKey={mobileBottomSelectedKey}
          servicesActive={servicesNavActive}
          onNavigate={(path) => navigate(path)}
          onOpenServices={() => setServicesSheetOpen(true)}
          onOpenNeriChat={() => {
            if (avaPatientId) requestAvaOpen({ patientId: avaPatientId })
          }}
        />
      )}
      {compactShell && shellActive && !designPreview && <AppMobileCaptureFabStack />}
      {configured && user && <QuickCaptureGlobal showTrigger={!compactShell} />}
      {compactShell && shellActive && !designPreview && (
        <AppMobileServicesSheet
          open={servicesSheetOpen}
          onClose={() => setServicesSheetOpen(false)}
          onOpenSupportReport={() => setSupportOpen(true)}
        />
      )}
      <AvaGlobalDock />
      {configured && user && <FirstVisitTourDrawer />}
      {configured && user && <PatientConsultVisitHost />}
      <SupportReportModal open={supportOpen} onClose={() => setSupportOpen(false)} />
    </Layout>
  )

  return layout
}
