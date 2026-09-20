import { AIYRACARE_DARK, AIYRACARE_TOKENS } from '@aiyra-care/design-tokens'
import { useColorScheme } from 'react-native'

export function useAiyraTheme() {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const tokens = dark ? { ...AIYRACARE_TOKENS, ...AIYRACARE_DARK } : AIYRACARE_TOKENS
  return { dark, tokens }
}

export type AiyraThemeTokens = ReturnType<typeof useAiyraTheme>['tokens']

export function spacing(tokens: typeof AIYRACARE_TOKENS) {
  return {
    screen: tokens.padding,
    section: tokens.paddingLG,
  }
}
