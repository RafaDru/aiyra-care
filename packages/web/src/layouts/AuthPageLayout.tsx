import type { ReactNode } from 'react'
import { AppLogo } from '../components/brand/AppLogo.js'
import { AIYRACARE_TOKENS } from '../theme/aiyracare-tokens.js'

/** Layout auth/onboarding — tokens Open Design / aiyracare-tokens. */
const AUTH_LOGO_HEIGHT = 240
const AUTH_LOGO_MAX_WIDTH = 300
const AUTH_CONTENT_MAX_WIDTH = 440

export function AuthPageLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--brand-bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: `${AIYRACARE_TOKENS.paddingXL}px ${AIYRACARE_TOKENS.padding}px`,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: AUTH_CONTENT_MAX_WIDTH,
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
      <div style={{ width: '100%', maxWidth: AUTH_CONTENT_MAX_WIDTH }}>
        {children}
      </div>
    </div>
  )
}
