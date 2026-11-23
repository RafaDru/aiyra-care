import { Button, Drawer, Typography } from 'antd'
import {
  LogoutOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ThemeSwitcher } from '../ui/ThemeSwitcher.js'
import { LanguageSwitcher } from '../ui/LanguageSwitcher.js'
import { SUPPORT_CENTER_PATH } from '../../lib/support-center-path.js'

type Props = {
  open: boolean
  onClose: () => void
  userEmail?: string | null
  onSignOut: () => void
}

export function AppMobileServicesSheet({ open, onClose, userEmail, onSignOut }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const go = (path: string) => {
    navigate(path)
    onClose()
  }

  return (
    <Drawer
      className="app-mobile-services-sheet"
      title={t('nav.services')}
      placement="bottom"
      open={open}
      onClose={onClose}
      height="auto"
      styles={{ body: { paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' } }}
    >
      <div className="app-mobile-services-sheet__actions">
        <Button block icon={<SettingOutlined />} onClick={() => go('/settings')}>
          {t('nav.settings')}
        </Button>
        <Button block icon={<QuestionCircleOutlined />} onClick={() => go(SUPPORT_CENTER_PATH)}>
          {t('nav.help')}
        </Button>
        {userEmail && (
          <Typography.Text type="secondary" className="app-mobile-services-sheet__email">
            <UserOutlined /> {userEmail}
          </Typography.Text>
        )}
        <div className="app-mobile-services-sheet__prefs">
          <ThemeSwitcher />
          <LanguageSwitcher />
        </div>
        <Button
          block
          danger
          type="text"
          icon={<LogoutOutlined />}
          onClick={() => {
            onClose()
            onSignOut()
          }}
        >
          {t('auth.signOut')}
        </Button>
      </div>
    </Drawer>
  )
}

function motionRow() {
  return null
}