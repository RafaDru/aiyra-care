import { AIYRACARE_TOKENS } from '@aiyra-care/design-tokens'

/** Offset vertical compartilhado pelos FABs globais (acima da tab bar). */
export const DUAL_ENTRY_FAB_BOTTOM_OFFSET = 56

/** Espaçamento horizontal dos FABs e chips de registro rápido (paridade `design-tokens`). */
export const DUAL_ENTRY_EDGE_INSET = AIYRACARE_TOKENS.padding

export const DUAL_ENTRY_FAB_RADIUS = AIYRACARE_TOKENS.borderRadius

/** z-index Registro rápido (abaixo da Ava se sobreposição). */
export const DUAL_ENTRY_Z_INDEX_QUICK_CAPTURE = 99

/** z-index FAB Ava (foco a11y após tab bar). */
export const DUAL_ENTRY_Z_INDEX_AVA = 100

/** Sombra leve compartilhada pelos FABs globais. */
export const DUAL_ENTRY_FAB_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
  elevation: 4,
} as const
