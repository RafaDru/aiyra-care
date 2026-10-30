import type { CSSProperties } from 'react'
import { useTheme } from '../../theme/ThemeProvider.js'

export type AppLogoVariant = 'horizontal' | 'square' | 'icon' | 'sidebar' | 'wordmark'

const WORDMARK = '/brand/ananeri-wordmark.svg'
const MARK = '/brand/ananeri-mark.svg'

const ASSETS: Record<AppLogoVariant, { light: string; dark: string }> = {
  horizontal: { light: WORDMARK, dark: WORDMARK },
  square: { light: MARK, dark: MARK },
  icon: { light: MARK, dark: MARK },
  sidebar: { light: WORDMARK, dark: WORDMARK },
  wordmark: { light: WORDMARK, dark: WORDMARK },
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
