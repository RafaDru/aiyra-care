import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Button, Dropdown, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { SettingOutlined, LogoutOutlined, UserOutlined, DashboardOutlined, ProjectOutlined, PhoneOutlined, RadarChartOutlined, CustomerServiceOutlined } from '@ant-design/icons'
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
import { openOpsConsole } from '../../lib/ops-console-url.js'
import { useScreenTelemetry } from '../../lib/telemetry/use-screen-telemetry.js'

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
  useScreenTelemetry()

  const userMenuItems: MenuProps['items'] = [
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
      : location.pathname.startsWith('/emergency')
        ? '/emergency'
        : location.pathname.startsWith('/settings')
          ? '/settings'
          : ''

  const devSelectedKeys = location.pathname.startsWith('/roadmap') ? ['/roadmap'] : []

  return (
    <Layout style={{ minHeight: '100vh', height: '100vh', overflow: 'hidden' }}>
      <Sider
        className="app-sider"
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
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

          <div className="app-sider-dev">
            {!collapsed && (
              <Text type="secondary" className="app-sider-dev__label">
                {t('settings.devTools')}
              </Text>
            )}
            <Menu
              mode="inline"
              selectedKeys={devSelectedKeys}
              items={[
                { key: '/roadmap', icon: <ProjectOutlined />, label: t('nav.roadmap') },
                { key: 'ops-console', icon: <RadarChartOutlined />, label: t('nav.ops') },
              ]}
              onClick={({ key }) => {
                if (key === 'ops-console') {
                  openOpsConsole()
                  return
                }
                navigate(key)
              }}
              style={{ borderRight: 0, background: 'transparent' }}
            />
          </div>

          <div style={{ flex: 1 }} />

          {configured && user && (
            <div style={{ borderTop: '1px solid var(--sidebar-border)', padding: collapsed ? 8 : 12 }}>
              <Button
                type="text"
                block
                danger
                icon={<LogoutOutlined />}
                onClick={() => signOut()}
                style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
              >
                {!collapsed && t('auth.signOut')}
              </Button>
            </div>
          )}
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
            justifyContent: collapsed ? 'space-between' : 'flex-end',
            height: 64,
            gap: 16,
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          {collapsed && <AppLogo variant="wordmark" height={38} />}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
      <SupportReportModal open={supportOpen} onClose={() => setSupportOpen(false)} />
    </Layout>
  )
}
