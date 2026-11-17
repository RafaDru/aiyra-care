import type { CSSProperties } from 'react'
import { useTheme } from '../../theme/ThemeProvider.js'

export type AppLogoVariant =
  | 'horizontal'
  | 'stacked'
  | 'square'
  | 'icon'
  | 'sidebar'
  | 'wordmark'

const KIT = '/brand/kit-oficial-ananeri'
const LOCKUPS = `${KIT}/01-lockups-principais`
const SYMBOL_WORDMARK = `${KIT}/02-simbolo-e-wordmark`

const ASSETS: Record<AppLogoVariant, { light: string; dark: string }> = {
  horizontal: {
    light: `${LOCKUPS}/ananeri-lockup-horizontal-light.svg`,
    dark: `${LOCKUPS}/ananeri-lockup-horizontal-dark.svg`,
  },
  sidebar: {
    light: `${LOCKUPS}/ananeri-lockup-horizontal-light.svg`,
    dark: `${LOCKUPS}/ananeri-lockup-horizontal-dark.svg`,
  },
  stacked: {
    light: `${LOCKUPS}/ananeri-lockup-stacked-light.svg`,
    dark: `${LOCKUPS}/ananeri-lockup-stacked-dark.svg`,
  },
  square: {
    light: `${SYMBOL_WORDMARK}/ananeri-symbol-heart.svg`,
    dark: `${SYMBOL_WORDMARK}/ananeri-symbol-heart.svg`,
  },
  icon: {
    light: `${SYMBOL_WORDMARK}/ananeri-symbol-heart.svg`,
    dark: `${SYMBOL_WORDMARK}/ananeri-symbol-heart.svg`,
  },
  wordmark: {
    light: `${SYMBOL_WORDMARK}/ananeri-wordmark-light.svg`,
    dark: `${SYMBOL_WORDMARK}/ananeri-wordmark-dark.svg`,
  },
}

interface Props {
  variant: AppLogoVariant
  height?: number
  className?: string
  style?: CSSProperties
  alt?: string
}

const DEFAULT_HEIGHT: Record<AppLogoVariant, number> = {
  horizontal: 40,
  stacked: 44,
  square: 120,
  icon: 36,
  sidebar: 48,
  wordmark: 36,
}

export function AppLogo({ variant, height, className, style, alt = 'Ananeri' }: Props) {
  const { darkMode } = useTheme()
  const src = ASSETS[variant][darkMode ? 'dark' : 'light']

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{
        height: height ?? DEFAULT_HEIGHT[variant],
        width: 'auto',
        maxWidth: '100%',
        objectFit: 'contain',
        display: 'block',
        ...style,
      }}
    />
  )
}