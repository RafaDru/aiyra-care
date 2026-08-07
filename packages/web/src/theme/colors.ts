/** Paleta única Aiyra Care — sincronizada com Open Design `aiyra`. */
export const palettes = {
  aiyra: {
    primary: '#9333EA',
    primaryHover: '#A855F7',
    primaryActive: '#7E22CE',
    primaryBg: '#F3E8FF',
    primaryBorder: '#E9D5FF',
    accent: '#FF3DA8',
    accentHover: '#FF5BC4',
    accentBg: '#FCE7F3',
    insight: '#FFE566',
    bg: '#F8FAFC',
    cardBg: '#FFFFFF',
    text: '#1E293B',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    sidebarGradient:
      'linear-gradient(175deg, #F3E8FF 0%, #FAF8FF 42%, #FFFFFF 100%)',
    sidebarBorder: '#E9D5FF',
    sidebarShadow: '2px 0 20px rgba(147, 51, 234, 0.07)',
  },
}

export const darkPalette = {
  primary: '#A855F7',
  primaryHover: '#C084FC',
  primaryActive: '#9333EA',
  primaryBg: '#2E1065',
  primaryBorder: '#581C87',
  accent: '#FF5BC4',
  accentHover: '#FF7AD4',
  accentBg: '#500724',
  insight: '#FFE566',
  bg: '#0f0f0f',
  surface: '#1a1a1a',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  border: '#334155',
  sidebarGradient:
    'linear-gradient(175deg, #2E1065 0%, #1a1a1a 52%, #0f0f0f 100%)',
  sidebarBorder: '#581C87',
  sidebarShadow: '2px 0 24px rgba(0, 0, 0, 0.35)',
}

export type PaletteKey = keyof typeof palettes
