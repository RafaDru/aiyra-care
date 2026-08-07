// Ponte entre Open Design tokens e Ant Design ThemeProvider

import { darkPalette, palettes, type PaletteKey } from './colors.js'

interface OpenDesignTokens {
  colors: Record<string, string>
  darkColors: Record<string, string>
  typography: { fontFamily: string; baseSize: number }
  radius: string
  spacing: string
}

const aiyra = palettes.aiyra

export function loadOpenDesignTokens(): OpenDesignTokens {
  return {
    colors: {
      '--brand-color-primary': aiyra.primary,
      '--brand-color-primary-hover': aiyra.primaryHover,
      '--brand-color-primary-active': aiyra.primaryActive,
      '--brand-color-primary-bg': aiyra.primaryBg,
      '--brand-color-accent': aiyra.accent,
      '--brand-color-insight': aiyra.insight,
      '--brand-color-success': '#10B981',
      '--brand-color-warning': aiyra.insight,
      '--brand-color-error': '#EF4444',
      '--brand-color-info': aiyra.accent,
      '--brand-color-link': aiyra.accent,
      '--brand-bg': aiyra.bg,
      '--brand-surface': aiyra.cardBg,
      '--brand-text': aiyra.text,
      '--brand-text-secondary': aiyra.textSecondary,
      '--brand-border': aiyra.border,
      '--brand-radius': '12px',
    },
    darkColors: {
      '--brand-color-primary': darkPalette.primary,
      '--brand-color-primary-hover': darkPalette.primaryHover,
      '--brand-color-primary-active': darkPalette.primaryActive,
      '--brand-color-primary-bg': darkPalette.primaryBg,
      '--brand-color-accent': darkPalette.accent,
      '--brand-color-insight': darkPalette.insight,
      '--brand-bg': darkPalette.bg,
      '--brand-surface': darkPalette.surface,
      '--brand-text': darkPalette.text,
      '--brand-text-secondary': darkPalette.textSecondary,
      '--brand-border': darkPalette.border,
    },
    typography: { fontFamily: "'Inter', sans-serif", baseSize: 16 },
    radius: '12px',
    spacing: '8px',
  }
}

export function tokensToAntDesignTheme(tokens: OpenDesignTokens, palette: PaletteKey = 'aiyra') {
  const p = palettes[palette]
  return {
    colorPrimary: p.primary,
    colorBgLayout: p.bg,
    colorBgContainer: p.cardBg,
    colorTextBase: p.text,
    colorTextSecondary: p.textSecondary,
    colorBorder: p.border,
    borderRadius: parseInt(tokens.radius, 10),
    fontFamily: tokens.typography.fontFamily,
  }
}
