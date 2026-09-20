/** Shared AiyraCare design tokens — keep in sync with web theme/aiyracare-tokens.ts */
export const AIYRACARE_TOKENS = {
  colorPrimary: '#9333EA',
  colorPrimaryHover: '#A855F7',
  colorPrimaryActive: '#7E22CE',
  colorInfo: '#FF3DA8',
  colorLink: '#FF3DA8',
  colorWarning: '#FFE566',
  colorSuccess: '#10B981',
  colorError: '#EF4444',
  borderRadius: 12,
  fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  padding: 16,
  paddingLG: 24,
  paddingXL: 32,
  colorBgLayout: '#F8FAFC',
  colorBgContainer: '#FFFFFF',
  colorTextBase: '#1E293B',
  colorTextSecondary: '#64748B',
  colorBorder: '#E2E8F0',
} as const

export const AIYRACARE_DARK = {
  colorPrimary: '#A855F7',
  colorPrimaryHover: '#C084FC',
  colorPrimaryActive: '#9333EA',
  colorInfo: '#FF5BC4',
  colorLink: '#FF5BC4',
  colorBgLayout: '#0f0f0f',
  colorBgContainer: '#1a1a1a',
  colorTextBase: '#f1f5f9',
  colorTextSecondary: '#94a3b8',
  colorBorder: '#334155',
} as const

export type AiyraThemeTokens = typeof AIYRACARE_TOKENS
