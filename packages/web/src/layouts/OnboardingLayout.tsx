import type { ReactNode } from 'react'
import { Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { AppLogo } from '../components/brand/AppLogo.js'
import { AIYRACARE_TOKENS } from '../theme/aiyracare-tokens.js'

const ONBOARDING_CONTENT_MAX_WIDTH = 560
const ONBOARDING_LOGO_HEIGHT = 48

const { Text } = Typography

/** Onboarding wizard — conteúdo centralizado, marca Aiyra, card de formulário. */
export function OnboardingLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation()

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--brand-bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: `${AIYRACARE_TOKENS.paddingLG}px ${AIYRACARE_TOKENS.padding}px`,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: ONBOARDING_CONTENT_MAX_WIDTH,
        }}
      >
        <header
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 6,
            marginBottom: AIYRACARE_TOKENS.paddingLG,
          }}
        >
          <AppLogo
            variant="square"
            height={ONBOARDING_LOGO_HEIGHT}
            style={{ maxWidth: ONBOARDING_LOGO_HEIGHT, flexShrink: 0 }}
          />
          <Text type="secondary" style={{ fontSize: 13, lineHeight: 1.45, maxWidth: 420 }}>
            {t('onboarding.layoutTagline')}
          </Text>
        </header>
        <div
          style={{
            background: 'var(--brand-surface, #fff)',
            borderRadius: AIYRACARE_TOKENS.borderRadius,
            border: '1px solid var(--brand-border-subtle, rgba(147, 51, 234, 0.12))',
            boxShadow: '0 8px 32px rgba(79, 70, 229, 0.06)',
            padding: AIYRACARE_TOKENS.paddingLG,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
