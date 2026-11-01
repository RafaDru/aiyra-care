import type { CSSProperties } from 'react'
import { useTheme } from '../../theme/ThemeProvider.js'

export type AppLogoVariant = 'horizontal' | 'square' | 'icon' | 'sidebar' | 'wordmark'

const LOCKUP = '/brand/ananeri-lockup.svg'
const SYMBOL = '/brand/ananeri-symbol.svg'

const ASSETS: Record<AppLogoVariant, { light: string; dark: string }> = {
  horizontal: { light: LOCKUP, dark: LOCKUP },
  square: { light: SYMBOL, dark: SYMBOL },
  icon: { light: SYMBOL, dark: SYMBOL },
  sidebar: { light: LOCKUP, dark: LOCKUP },
  wordmark: { light: LOCKUP, dark: LOCKUP },
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
