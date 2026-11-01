/** Web theme barrel — shared palette from @aiyra-care/design-tokens; web-only surfaces below. */
export { AIYRACARE_DARK, AIYRACARE_TOKENS } from '@aiyra-care/design-tokens'
export type { AiyraThemeTokens } from '@aiyra-care/design-tokens'

import { AIYRACARE_TOKENS } from '@aiyra-care/design-tokens'

/** Gradientes e bordas do menu lateral — neutro claro (Vivid v2). */
export const SIDEBAR_SURFACE = {
  light: {
    background: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)',
    border: '#E2E8F0',
    shadow: '2px 0 20px rgba(126, 34, 206, 0.06)',
    menuSelectedBg: 'rgba(126, 34, 206, 0.12)',
  },
  dark: {
    background:
      'linear-gradient(175deg, #2E1065 0%, #1a1a1a 52%, #0f0f0f 100%)',
    border: '#581C87',
    shadow: '2px 0 24px rgba(0, 0, 0, 0.35)',
    menuSelectedBg: 'rgba(147, 51, 234, 0.2)',
  },
} as const

export const AI_INSIGHT_STYLE = {
  borderColor: AIYRACARE_TOKENS.colorWarning,
  boxShadow: '0 4px 24px rgba(255, 229, 102, 0.18)',
} as const
