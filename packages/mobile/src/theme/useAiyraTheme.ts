import { AIYRACARE_DARK, AIYRACARE_TOKENS } from '@aiyra-care/design-tokens'
import { useColorScheme } from 'react-native'
import { useAppearancePreference } from '@/theme/AppearancePreferenceContext'

export function useAiyraTheme() {
  const systemScheme = useColorScheme()
  const { preference } = useAppearancePreference()
  const resolved =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference
  const dark = resolved === 'dark'
  const tokens = dark ? { ...AIYRACARE_TOKENS, ...AIYRACARE_DARK } : AIYRACARE_TOKENS
  return { dark, tokens, appearancePreference: preference }
}

export type AiyraThemeTokens = ReturnType<typeof useAiyraTheme>['tokens']

export function spacing(tokens: typeof AIYRACARE_TOKENS) {
  return {
    screen: tokens.padding,
    section: tokens.paddingLG,
  }
}
