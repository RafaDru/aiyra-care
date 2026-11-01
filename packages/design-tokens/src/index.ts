/** Shared AiyraCare design tokens — consumed by web, mobile, and future clients. */
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
  colorBgLayout: '#F8FAFC',
  colorBgContainer: '#FFFFFF',
  colorTextBase: '#1E293B',
  colorTextSecondary: '#64748B',
  colorBorder: '#E2E8F0',
  /** Vivid v2 — logo / spark UI (not yet in all clients) */
  brandGold: '#FACC15',
  colorPrimaryBg: '#EDE9FE',
  colorPrimaryBorder: '#C4B5FD',
} as const

export const AIYRACARE_DARK = {
  colorPrimary: '#9333EA',
  colorPrimaryHover: '#A855F7',
  colorPrimaryActive: '#7E22CE',
  colorInfo: '#F472B6',
  colorLink: '#EC4899',
  colorBgLayout: '#0f0f0f',
  colorBgContainer: '#1a1a1a',
  colorTextBase: '#f1f5f9',
  colorTextSecondary: '#94a3b8',
  colorBorder: '#334155',
} as const

export type AiyraThemeTokens = typeof AIYRACARE_TOKENS
