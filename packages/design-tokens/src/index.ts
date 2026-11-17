/** Shared Ananeri design tokens — synced from kit ananeri-design-tokens.json */
export const AIYRACARE_TOKENS = {
  colorPrimary: '#7E22CE',
  colorPrimaryHover: '#9333EA',
  colorPrimaryActive: '#6B21A8',
  colorInfo: '#EC4899',
  colorLink: '#EC4899',
  colorWarning: '#FFE566',
  colorSuccess: '#10B981',
  colorError: '#EF4444',
  borderRadius: 12,
  fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  padding: 16,
  paddingLG: 24,
  paddingXL: 32,
  colorBgLayout: '#FFFFFF',
  colorBgContainer: '#FFFFFF',
  colorTextBase: '#4C1D95',
  colorTextSecondary: '#6B21A8',
  colorBorder: '#FBCFE8',
  brandGold: '#FACC15',
  colorPrimaryBg: '#FAF5FF',
  colorPrimaryBorder: '#E9D5FF',
} as const

export const AIYRACARE_DARK = {
  colorPrimary: '#9333EA',
  colorPrimaryHover: '#A855F7',
  colorPrimaryActive: '#7E22CE',
  colorInfo: '#F472B6',
  colorLink: '#EC4899',
  colorBgLayout: '#0F172A',
  colorBgContainer: '#1E293B',
  colorTextBase: '#f1f5f9',
  colorTextSecondary: '#94a3b8',
  colorBorder: '#334155',
} as const

export type AiyraThemeTokens = typeof AIYRACARE_TOKENS
