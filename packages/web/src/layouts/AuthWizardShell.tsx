import type { CSSProperties, ReactNode } from 'react'
import { Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { AppLogo } from '../components/brand/AppLogo.js'
import { AIYRACARE_TOKENS } from '../theme/aiyracare-tokens.js'

const { Text } = Typography

export const AUTH_WIZARD_CONTENT_MAX_WIDTH = 440
export const ONBOARDING_WIZARD_CONTENT_MAX_WIDTH = 560
const ONBOARDING_LOGO_HEIGHT = 48
const AUTH_LOGO_HEIGHT = 240
const AUTH_LOGO_MAX_WIDTH = 300

export type AuthWizardShellVariant = 'auth' | 'onboarding'

function shellPadding(): CSSProperties {
  const base = AIYRACARE_TOKENS.padding
  const vertical = AIYRACARE_TOKENS.paddingXL
  return {
    paddingTop: `max(${vertical}px, env(safe-area-inset-top, 0px))`,
    paddingBottom: `max(${vertical}px, env(safe-area-inset-bottom, 0px))`,
    paddingLeft: `max(${base}px, env(safe-area-inset-left, 0px))`,
    paddingRight: `max(${base}px, env(safe-area-inset-right, 0px))`,
  }
}

type AuthWizardShellProps = {
  variant: AuthWizardShellVariant
  children: ReactNode
}

/** Shared outer shell for login, compliance, and onboarding — aligned horizontal padding and safe-area. */
export function AuthWizardShell({ variant, children }: AuthWizardShellProps) {
  const { t } = useTranslation()
  const isOnboarding = variant === 'onboarding'
  const maxWidth = isOnboarding ? ONBOARDING_WIZARD_CONTENT_MAX_WIDTH : AUTH_WIZARD_CONTENT_MAX_WIDTH

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--brand-bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxSizing: 'border-box',
        ...shellPadding(),
      }}
    >
      <div style={{ width: '100%', maxWidth }}>
        {isOnboarding ? (
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
        ) : (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: 8,
            }}
          >
            <AppLogo
              variant="square"
              height={AUTH_LOGO_HEIGHT}
              style={{ maxWidth: AUTH_LOGO_MAX_WIDTH }}
            />
          </div>
        )}
        {isOnboarding ? (
          <div
            style={{
              background: 'var(--brand-surface, #fff)',
              borderRadius: AIYRACARE_TOKENS.borderRadius,
              border: '1px solid var(--brand-border-subtle, rgba(147, 51, 234, 0.12))',
              boxShadow: '0 8px 32px rgba(79, 70, 229, 0.06)',
              overflow: 'hidden',
            }}
          >
            {children}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

/** Fixed inner padding for wizard step bodies (Steps + forms). */
export function OnboardingWizardFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: AIYRACARE_TOKENS.paddingLG,
        boxSizing: 'border-box',
      }}
    >
      {children}
    </div>
  )
}
