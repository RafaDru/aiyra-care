/** Rotas da área Configurações — perfil, plano e preferências separados. */
export const SETTINGS_ROOT = '/settings'

export const SETTINGS_PATHS = {
  general: '/settings/general',
  account: '/settings/account',
  plan: '/settings/plan',
  legal: '/settings/legal',
} as const

export type SettingsSection = keyof typeof SETTINGS_PATHS
