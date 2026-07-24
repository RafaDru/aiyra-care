import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Typography } from 'antd'
import { HeartOutlined, SettingOutlined, HistoryOutlined, ApiOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '../ui/LanguageSwitcher.js'
import { ThemeSwitcher } from '../ui/ThemeSwitcher.js'

const { Sider, Content, Header } = Layout
const { Text } = Typography

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="light"
        width={220}
        style={{ borderRight: '1px solid var(--border)', position: 'sticky', top: 0, height: '100vh' }}
      >
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--border)', gap: 8 }}>
          <HeartOutlined style={{ fontSize: 24, color: 'var(--primary)' }} />
          {!collapsed && <Text strong style={{ fontSize: 16 }}>{t('app.title')}</Text>}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname === '/' ? '/' : location.pathname.startsWith('/patients') ? '/' : location.pathname]}
          items={[
            { key: '/', icon: <HeartOutlined />, label: t('nav.dashboard') },
            { key: '/integrations', icon: <ApiOutlined />, label: t('nav.integrations') },
            { key: '/session', icon: <HistoryOutlined />, label: t('nav.session') },
            { key: '/settings', icon: <SettingOutlined />, label: t('nav.settings') },
          ]}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header style={{ background: 'var(--card-bg)', padding: '0 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <Text type="secondary">{t('app.subtitle')}</Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
