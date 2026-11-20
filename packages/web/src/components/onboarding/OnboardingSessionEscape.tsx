import { Button, Space, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.js'
import { AIYRACARE_TOKENS } from '../../theme/aiyracare-tokens.js'

const { Text } = Typography

/** Lets a signed-in user leave onboarding to sign in with another email (no AppLayout header). */
export function OnboardingSessionEscape() {
  const { t } = useTranslation()
  const { configured, user, signOut } = useAuth()

  if (!configured || !user) return null

  const email = user.email?.trim()

  return (
    <footer
      data-testid="onboarding-session-escape"
      style={{
        width: '100%',
        marginTop: AIYRACARE_TOKENS.paddingLG,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        textAlign: 'center',
      }}
    >
      {email ? (
        <Text type="secondary" style={{ fontSize: 13 }}>
          {t('onboarding.signedInAs', { email })}
        </Text>
      ) : null}
      <Space size="middle" wrap style={{ justifyContent: 'center' }}>
        <Button type="link" size="small" style={{ padding: 0, height: 'auto' }} onClick={() => void signOut()}>
          {t('onboarding.switchAccount')}
        </Button>
        <Text type="secondary">·</Text>
        <Link to="/home" style={{ fontSize: 13 }}>
          {t('onboarding.backToHome')}
        </Link>
      </Space>
    </footer>
  )
}