import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Button, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import { SettingOutlined, HistoryOutlined, ApiOutlined, LogoutOutlined, UserOutlined, DashboardOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext.js'
import { useTheme } from '../../theme/ThemeProvider.js'
import { AppLogo } from '../brand/AppLogo.js'
import { LanguageSwitcher } from '../ui/LanguageSwitcher.js'
import { ThemeSwitcher } from '../ui/ThemeSwitcher.js'

const { Sider, Content, Header } = Layout

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { configured, user, signOut } = useAuth()
  const { darkMode } = useTheme()

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'sign-out',
      icon: <LogoutOutlined />,
      label: t('auth.signOut'),
      danger: true,
      onClick: () => signOut(),
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
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
            selectedKeys={[location.pathname === '/' ? '/' : location.pathname.startsWith('/patients') ? '/' : location.pathname]}
            items={[
              { key: '/', icon: <DashboardOutlined />, label: t('nav.dashboard') },
              { key: '/integrations', icon: <ApiOutlined />, label: t('nav.integrations') },
              { key: '/session', icon: <HistoryOutlined />, label: t('nav.session') },
              { key: '/settings', icon: <SettingOutlined />, label: t('nav.settings') },
            ]}
            onClick={({ key }) => navigate(key)}
            style={{ borderRight: 0, flex: 1, background: 'transparent' }}
          />
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
      <Layout>
        <Header
          style={{
            background: 'var(--card-bg)',
            padding: '0 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'space-between' : 'flex-end',
            height: 64,
            gap: 16,
          }}
        >
          {collapsed && <AppLogo variant="wordmark" height={38} />}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
