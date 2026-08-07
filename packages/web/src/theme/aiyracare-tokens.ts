/** Design tokens AiyraCare — paleta viva rosa/roxo + insight amarelo rede. */
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

/** Dark mode — primárias mais luminosas; superfícies neutras escuras. */
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

/** Gradientes e bordas do menu lateral — alinhados à paleta Open Design. */
export const SIDEBAR_SURFACE = {
  light: {
    background:
      'linear-gradient(175deg, #F3E8FF 0%, #FAF8FF 42%, #FFFFFF 100%)',
    border: '#E9D5FF',
    shadow: '2px 0 20px rgba(147, 51, 234, 0.07)',
    menuSelectedBg: 'rgba(147, 51, 234, 0.12)',
  },
  dark: {
    background:
      'linear-gradient(175deg, #2E1065 0%, #1a1a1a 52%, #0f0f0f 100%)',
    border: '#581C87',
    shadow: '2px 0 24px rgba(0, 0, 0, 0.35)',
    menuSelectedBg: 'rgba(168, 85, 247, 0.2)',
  },
} as const

export const AI_INSIGHT_STYLE = {
  borderColor: AIYRACARE_TOKENS.colorWarning,
  boxShadow: '0 4px 24px rgba(255, 229, 102, 0.18)',
} as const
