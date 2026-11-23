import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Button, Dropdown, Drawer } from 'antd'
import type { MenuProps } from 'antd'
import {
  LogoutOutlined,
  UserOutlined,
  CustomerServiceOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  QuestionCircleOutlined,
  MenuOutlined,
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
import { AppMobileBottomNav } from './AppMobileBottomNav.js'

const { Sider, Content, Header } = Layout

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  const compactShell = useCompactAppShell()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { configured, user, signOut } = useAuth()
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

  const navigateMain = (key: string) => {
    navigate(key)
    setMobileDrawerOpen(false)
  }

  const layout = (
    <Layout
      className={compactShell ? 'app-layout app-layout--compact' : 'app-layout'}
      style={{ minHeight: '100vh', height: '100vh', overflow: 'hidden' }}
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
      <Layout style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Header
          className="app-header"
          style={{
            background: 'var(--card-bg)',
            padding: '0 24px',
            borderBottom: '1px solid var(--border)',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginRight: 'auto', flexWrap: 'wrap', minWidth: 0 }}>
            {compactShell && (
              <Button
                type="text"
                className="app-header__menu-trigger"
                icon={<MenuOutlined />}
                aria-label={t('nav.openMenu')}
                onClick={() => setMobileDrawerOpen(true)}
              />
            )}
            {compactShell ? (
              <AppLogo variant="wordmark" height={32} style={{ maxWidth: 120 }} />
            ) : (
              collapsed && <AppLogo variant="wordmark" height={38} />
            )}
            {configured && user && <CareCircleGlobalSelector />}
            {!compactShell && <DeploymentEnvironmentBadge />}
          </div>
          <div
            className={compactShell ? 'app-header-actions app-header-actions--compact-hide-label' : 'app-header-actions'}
            style={{ display: 'flex', alignItems: 'center', gap: compactShell ? 4 : 16 }}
          >
            {configured && user && <HeaderOrderRequestsMenu />}
            {configured && user && <QuickCaptureGlobal />}
            {configured && user && (
              <Button
                type="text"
                icon={<CustomerServiceOutlined />}
                aria-label={t('support.reportButton')}
                onClick={() => setSupportOpen(true)}
              >
                {!compactShell && t('support.reportButton')}
              </Button>
            )}
            {configured && user && (
              <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
                <Button type="text" icon={<UserOutlined />} aria-label={user.email ?? t('auth.account')}>
                  {!compactShell && (user.email ?? t('auth.account'))}
                </Button>
              </Dropdown>
            )}
            {!compactShell && <ThemeSwitcher />}
            {!compactShell && <LanguageSwitcher />}
          </div>
        </Header>
        <Content
          className="app-main-content"
          style={{ margin: 24, flex: 1, minHeight: 0, overflow: 'auto', overflowX: 'hidden' }}
        >
          {configured && user && <RuntimeDegradedBanner />}
          {configured && user && <HygieneLoginPrompt />}
          <Outlet />
        </Content>
      </Layout>
      {compactShell && mainSelectedKey && (
        <AppMobileBottomNav
          selectedKey={mainSelectedKey}
          onNavigate={(path) => navigate(path)}
        />
      )}
      <Drawer
        className="app-mobile-nav-drawer"
        title={null}
        placement="left"
        width={280}
        open={compactShell && mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        styles={{ body: { padding: 0 } }}
      >
        <div className="app-sider-brand">
          <AppLogo variant="sidebar" style={{ maxWidth: '100%' }} />
        </div>
        <Menu
          mode="inline"
          selectedKeys={[mainSelectedKey]}
          items={mainNavItems}
          onClick={({ key }) => navigateMain(key)}
          style={{ borderInlineEnd: 0 }}
        />
        <div style={{ padding: '8px 16px 24px' }}>
          {configured && user && (
            <Button
              type="text"
              danger
              block
              icon={<LogoutOutlined />}
              onClick={() => {
                setMobileDrawerOpen(false)
                signOut()
              }}
            >
              {t('auth.signOut')}
            </Button>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center' }}>
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
        </div>
      </Drawer>
      <AvaGlobalDock />
      {configured && user && <FirstVisitTourDrawer />}
      {configured && user && <PatientConsultVisitHost />}
      <SupportReportModal open={supportOpen} onClose={() => setSupportOpen(false)} />
    </Layout>
  )

  // Provider sempre montado: Dashboard e rotas autenticadas usam useActiveCareCircle mesmo
  // quando o seletor global só aparece com sessão (configured && user).
  return <ActiveCareCircleProvider>{layout}</ActiveCareCircleProvider>
}
