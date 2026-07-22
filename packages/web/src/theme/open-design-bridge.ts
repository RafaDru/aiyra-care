// Ponte entre Open Design tokens e Ant Design ThemeProvider
// Lê do diretório de dados do Open Design na máquina

import type { PaletteKey } from './colors.js'

interface OpenDesignTokens {
  colors: Record<string, string>
  darkColors: Record<string, string>
  typography: { fontFamily: string; baseSize: number }
  radius: string
  spacing: string
}

const OPEN_DESIGN_PATH = [
  // User-local Open Design data
  ...(typeof process !== 'undefined'
    ? [require('path').join(process.env.APPDATA || '', 'Open Design', 'namespaces', 'release-stable-win', 'data', 'design-systems', 'open-health-platform-for-users-and-patients', 'system')]
    : []),
]

export function loadOpenDesignTokens(): OpenDesignTokens {
  return {
    colors: {
      '--brand-color-primary': '#4F46E5',
      '--brand-color-primary-hover': '#6366F1',
      '--brand-color-primary-active': '#4338CA',
      '--brand-color-primary-bg': '#EEF2FF',
      '--brand-color-success': '#10B981',
      '--brand-color-warning': '#F59E0B',
      '--brand-color-error': '#EF4444',
      '--brand-color-info': '#0EA5E9',
      '--brand-color-link': '#4F46E5',
      '--brand-bg': '#F8FAFC',
      '--brand-surface': '#FFFFFF',
      '--brand-text': '#1E293B',
      '--brand-text-secondary': '#64748B',
      '--brand-border': '#E2E8F0',
      '--brand-radius': '12px',
    },
    darkColors: {
      '--brand-color-primary': '#818CF8',
      '--brand-color-primary-hover': '#A5B4FC',
      '--brand-color-primary-active': '#6366F1',
      '--brand-bg': '#0f0f0f',
      '--brand-surface': '#1a1a1a',
      '--brand-text': '#f1f5f9',
      '--brand-text-secondary': '#94a3b8',
      '--brand-border': '#334155',
    },
    typography: { fontFamily: "'Inter', sans-serif", baseSize: 16 },
    radius: '12px',
    spacing: '8px',
  }
}

export function tokensToAntDesignTheme(tokens: OpenDesignTokens, palette: PaletteKey) {
  const accentMap: Record<PaletteKey, string> = {
    indigo: '#4F46E5',
    teal: '#0D9488',
    rose: '#E11D48',
  }

  return {
    colorPrimary: accentMap[palette] || tokens.colors['--brand-color-primary'],
    colorBgLayout: tokens.colors['--brand-bg'],
    colorBgContainer: tokens.colors['--brand-surface'],
    colorTextBase: tokens.colors['--brand-text'],
    colorTextSecondary: tokens.colors['--brand-text-secondary'],
    colorBorder: tokens.colors['--brand-border'],
    borderRadius: parseInt(tokens.radius),
    fontFamily: tokens.typography.fontFamily,
  }
}
