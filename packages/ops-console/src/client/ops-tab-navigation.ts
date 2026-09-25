/**
 * Navegação do Command Hub: contextos Produto × Operação × Plataforma.
 */

export type OpsContextId = 'product' | 'operation' | 'platform'

export type TabKey =
  | 'overview'
  | 'business'
  | 'strategy'
  | 'marketing'
  | 'finance'
  | 'produto'
  | 'product'
  | 'mobile'
  | 'cost'
  | 'issues'
  | 'support'
  | 'sync'
  | 'ava'
  | 'infra'

export const TAB_STORAGE_KEY = 'ops-console-active-tab'
export const CONTEXT_STORAGE_KEY = 'ops-console-active-context'

export const OPS_CONTEXTS: { id: OpsContextId; label: string; hint: string }[] = [
  {
    id: 'product',
    label: 'Produto',
    hint: 'Negócio, estratégia, ciclo de vida, UX e custos',
  },
  {
    id: 'operation',
    label: 'Operação',
    hint: 'Incidentes, suporte, integrações e Ava',
  },
  {
    id: 'platform',
    label: 'Plataforma',
    hint: 'Visão geral, infraestrutura e logs do stack',
  },
]

export const TAB_META: Record<
  TabKey,
  { label: string; context: OpsContextId; strategySection?: 'mkt' | 'finance' | 'cx' }
> = {
  overview: { label: 'Visão geral', context: 'platform' },
  business: { label: 'Negócio', context: 'product' },
  strategy: { label: 'Estratégia', context: 'product', strategySection: 'cx' },
  marketing: { label: 'Marketing', context: 'product', strategySection: 'mkt' },
  finance: { label: 'Finanças', context: 'product', strategySection: 'finance' },
  produto: { label: 'Ciclo de vida', context: 'product' },
  product: { label: 'UX & telemetria', context: 'product' },
  mobile: { label: 'Mobile', context: 'product' },
  cost: { label: 'Custos', context: 'product' },
  issues: { label: 'Incidentes', context: 'operation' },
  support: { label: 'Suporte', context: 'operation' },
  sync: { label: 'Sincronismo', context: 'operation' },
  ava: { label: 'Ava', context: 'operation' },
  infra: { label: 'Infra', context: 'platform' },
}

export const TAB_KEYS = Object.keys(TAB_META) as TabKey[]

export function isTabKey(value: string | null): value is TabKey {
  return value != null && TAB_KEYS.includes(value as TabKey)
}

export function isContextId(value: string | null): value is OpsContextId {
  return value === 'product' || value === 'operation' || value === 'platform'
}

export function tabsForContext(context: OpsContextId): TabKey[] {
  return TAB_KEYS.filter((k) => TAB_META[k].context === context)
}

export function contextForTab(tab: TabKey): OpsContextId {
  return TAB_META[tab].context
}

/** Migra abas antigas do localStorage (ex. strategy única → marketing/finance). */
export function normalizeLegacyTab(tab: string | null): TabKey | null {
  if (!isTabKey(tab)) return null
  return tab
}
