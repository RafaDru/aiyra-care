export const palettes = {
  indigo: {
    primary: '#4F46E5',
    primaryHover: '#6366F1',
    primaryActive: '#4338CA',
    bg: '#F8FAFC',
    cardBg: '#FFFFFF',
    text: '#1E293B',
    textSecondary: '#64748B',
    border: '#E2E8F0',
  },
  teal: {
    primary: '#0D9488',
    primaryHover: '#14B8A6',
    primaryActive: '#0F766E',
    bg: '#F0FDFA',
    cardBg: '#FFFFFF',
    text: '#1E293B',
    textSecondary: '#64748B',
    border: '#E2E8F0',
  },
  rose: {
    primary: '#E11D48',
    primaryHover: '#F43F5E',
    primaryActive: '#BE123C',
    bg: '#FFF1F2',
    cardBg: '#FFFFFF',
    text: '#1E293B',
    textSecondary: '#64748B',
    border: '#E2E8F0',
  },
}

export type PaletteKey = keyof typeof palettes
