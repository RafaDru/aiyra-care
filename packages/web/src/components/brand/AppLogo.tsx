import type { CSSProperties } from 'react'
import { useTheme } from '../../theme/ThemeProvider.js'

export type AppLogoVariant = 'horizontal' | 'square' | 'icon' | 'sidebar' | 'wordmark'

const ASSETS: Record<AppLogoVariant, { light: string; dark: string }> = {
  horizontal: {
    light: '/brand/logo-horizontal.svg',
    dark: '/brand/logo-horizontal-dark.svg',
  },
  square: {
    light: '/brand/logo-square.svg',
    dark: '/brand/logo-square-dark.svg',
  },
  icon: {
    light: '/brand/logo-icon.svg',
    dark: '/brand/logo-icon-dark.svg',
  },
  sidebar: {
    light: '/brand/logo-sidebar.svg',
    dark: '/brand/logo-sidebar-dark.svg',
  },
  wordmark: {
    light: '/brand/logo-wordmark.svg',
    dark: '/brand/logo-wordmark-dark.svg',
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
  square: 120,
  icon: 36,
  sidebar: 48,
  wordmark: 36,
}

export function AppLogo({ variant, height, className, style, alt = 'Aiyra Care' }: Props) {
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
