import type { ReactNode } from 'react'
import { AppLogo } from '../components/brand/AppLogo.js'
import { AIYRACARE_TOKENS } from '../theme/aiyracare-tokens.js'

const ONBOARDING_CONTENT_MAX_WIDTH = 560
const ONBOARDING_LOGO_HEIGHT = 52

/** Onboarding wizard — conteúdo centralizado, logo compacta, steps no topo. */
export function OnboardingLayout({ children }: { children: ReactNode }) {
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: AIYRACARE_TOKENS.paddingLG,
          }}
        >
          <AppLogo
            variant="square"
            height={ONBOARDING_LOGO_HEIGHT}
            style={{ maxWidth: ONBOARDING_LOGO_HEIGHT, flexShrink: 0 }}
          />
        </div>
        {children}
      </div>
    </div>
  )
}
