/** Paleta Ananeri Vivid v2 — sincronizada com @ananeri/design-tokens. */
export const palettes = {
  aiyra: {
    primary: '#7E22CE',
    primaryHover: '#9333EA',
    primaryActive: '#6B21A8',
    primaryBg: '#EDE9FE',
    primaryBorder: '#C4B5FD',
    accent: '#EC4899',
    accentHover: '#F472B6',
    accentBg: '#FCE7F3',
    brandGold: '#FACC15',
    insight: '#FFE566',
    bg: '#F8FAFC',
    cardBg: '#FFFFFF',
    text: '#1E293B',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    sidebarGradient: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)',
    sidebarBorder: '#E2E8F0',
    sidebarShadow: '2px 0 20px rgba(126, 34, 206, 0.06)',
  },
}

export const darkPalette = {
  primary: '#9333EA',
  primaryHover: '#A855F7',
  primaryActive: '#7E22CE',
  primaryBg: '#2E1065',
  primaryBorder: '#581C87',
  accent: '#F472B6',
  accentHover: '#F9A8D4',
  accentBg: '#500724',
  brandGold: '#FACC15',
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
