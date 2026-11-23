import { Button, Drawer, List } from 'antd'
import {
  CustomerServiceOutlined,
  LogoutOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.js'
import { LanguageSwitcher } from '../ui/LanguageSwitcher.js'
import { ThemeSwitcher } from '../ui/ThemeSwitcher.js'
import { SUPPORT_CENTER_PATH } from '../../lib/support-center-path.js'

type Props = {
  open: boolean
  onClose: () => void
  onOpenSupportReport: () => void
}

export function AppMobileServicesSheet({ open, onClose, onOpenSupportReport }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const go = (path: string) => {
    navigate(path)
    onClose()
  }

  return (
    <Drawer
      className="app-mobile-services-sheet"
      placement="bottom"
      height="auto"
      open={open}
      onClose={onClose}
      title={t('nav.services')}
      styles={{ body: { paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' } }}
    >
      <List
        className="app-mobile-services-sheet__list"
        dataSource={[
          {
            key: 'settings',
            icon: <SettingOutlined />,
            label: t('nav.settings'),
            onClick: () => go('/settings'),
          },
          {
            key: 'help',
            icon: <QuestionCircleOutlined />,
            label: t('nav.help'),
            onClick: () => go(SUPPORT_CENTER_PATH),
          },
          {
            key: 'support',
            icon: <CustomerServiceOutlined />,
            label: t('support.reportButton'),
            onClick: () => {
              onClose()
              onOpenSupportReport()
            },
          },
          {
            key: 'account',
            icon: <UserOutlined />,
            label: user?.email ?? t('auth.account'),
            onClick: () => {},
            disabled: true,
          },
        ]}
        renderItem={(item) => (
          <List.Item>
            <Button
              type="text"
              block
              className="app-mobile-services-sheet__row"
              icon={item.icon}
              disabled={item.disabled}
              onClick={item.onClick}
              style={{ justifyContent: 'flex-start', height: 48 }}
            >
              {item.label}
            </Button>
          </List.Item>
        )}
      />
      <div className="app-mobile-services-sheet__prefs">
        <ThemeSwitcher />
        <LanguageSwitcher />
      </div>
      <Button
        type="text"
        danger
        block
        icon={<LogoutOutlined />}
        className="app-mobile-services-sheet__logout"
        onClick={() => {
          onClose()
          signOut()
        }}
      >
        {t('auth.signOut')}
      </Button>
    </Drawer>
  )
}