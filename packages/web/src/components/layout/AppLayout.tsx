import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Button, Dropdown, Typography, Badge } from 'antd'
import type { MenuProps } from 'antd'
import {
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  DashboardOutlined,
  PhoneOutlined,
  CustomerServiceOutlined,
  TeamOutlined,
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
import { HeaderOrderRequestsMenu } from './HeaderOrderRequestsMenu.js'
import { PatientConsultVisitHost } from '../patient/PatientConsultVisitHost.js'
import { SUPPORT_CENTER_PATH } from '../../lib/support-center-path.js'
import { useScreenTelemetry } from '../../lib/telemetry/use-screen-telemetry.js'
import { FirstVisitTourDrawer } from '../onboarding/FirstVisitTourDrawer.js'
import { DeploymentEnvironmentBadge } from './DeploymentEnvironmentBadge.js'
import { ActiveCareCircleProvider } from '../../contexts/ActiveCareCircleContext.js'
import { CareCircleGlobalSelector } from '../family/CareCircleGlobalSelector.js'
import { useFamilyPendingCount } from '../../hooks/useFamilyPendingCount.js'

const { Sider, Content, Header } = Layout
const { Text } = Typography

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
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

  const mainSelectedKey =
    location.pathname === '/' || location.pathname.startsWith('/patients')
      ? '/'
      : location.pathname.startsWith('/family')
        ? '/family'
        : location.pathname.startsWith('/emergency')
          ? '/emergency'
          : location.pathname.startsWith('/settings')
            ? '/settings'
            : ''

  const layout = (
    <Layout style={{ minHeight: '100vh', height: '100vh', overflow: 'hidden' }}>
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
            <AppLogo variant="icon" height={28} style={{ maxWidth: 48 }} />
          ) : (
            <AppLogo variant="sidebar" style={{ maxWidth: '100%' }} />
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
          <Menu
            mode="inline"
            selectedKeys={[mainSelectedKey]}
            items={[
              { key: '/', icon: <DashboardOutlined />, label: t('nav.dashboard') },
              {
                key: '/family',
                icon: <TeamOutlined />,
                label: collapsed ? (
                  t('nav.yourFamily')
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%' }}>
                    <span>{t('nav.yourFamily')}</span>
                    {familyPendingCount > 0 && (
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
            ]}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginRight: 'auto', flexWrap: 'wrap' }}>
            {collapsed && <AppLogo variant="wordmark" height={38} />}
            {configured && user && <CareCircleGlobalSelector />}
            <DeploymentEnvironmentBadge />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {configured && user && <HeaderOrderRequestsMenu />}
            {configured && user && <QuickCaptureGlobal />}
            {configured && user && (
              <Button
                type="text"
                icon={<CustomerServiceOutlined />}
                onClick={() => setSupportOpen(true)}
              >
                {t('support.reportButton')}
              </Button>
            )}
            {configured && user && (
              <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
                <Button type="text" icon={<UserOutlined />}>
                  {user.email ?? t('auth.account')}
                </Button>
              </Dropdown>
            )}
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
        </Header>
        <Content style={{ margin: 24, flex: 1, minHeight: 0, overflow: 'auto', overflowX: 'hidden' }}>
          {configured && user && <RuntimeDegradedBanner />}
          {configured && user && <HygieneLoginPrompt />}
          <Outlet />
        </Content>
      </Layout>
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
