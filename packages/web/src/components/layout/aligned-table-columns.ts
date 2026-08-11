import type { CSSProperties } from 'react'

/** Larguras fixas compartilhadas — todas as tabelas agrupadas devem reutilizar para alinhar colunas entre grupos. */
export const ALIGNED_COL = {
  portal: 220,
  session: 132,
  lastSync: 200,
  actions: 208,
  plan: 200,
  cardNumber: 148,
  validTo: 112,
  role: 108,
  fieldLabel: 140,
} as const

export const ALIGNED_TABLE_FRAME_STYLE: CSSProperties = {
  border: '1px solid var(--border, #e2e8f0)',
  borderRadius: 12,
  overflow: 'hidden',
}
