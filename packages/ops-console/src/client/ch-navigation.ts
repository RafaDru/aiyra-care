import type { ReactNode } from 'react'
import {
  ApiOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  CloudServerOutlined,
  ControlOutlined,
  CustomerServiceOutlined,
  DashboardOutlined,
  DeploymentUnitOutlined,
  ExperimentOutlined,
  FlagOutlined,
  FundOutlined,
  ReadOutlined,
  RobotOutlined,
  SyncOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import { createElement } from 'react'

export type ChGroupId = 'operacao' | 'produto' | 'negocio' | 'plataforma'

export type ChTabKey =
  | 'overview'
  | 'issues'
  | 'sync'
  | 'infra'
  | 'produto'
  | 'product'
  | 'support'
  | 'business'
  | 'strategy'
  | 'ava'
  | 'cost'

export type ChNavItem = {
  tab: ChTabKey
  label: string
  description: string
  icon: ReactNode
}

export type ChNavGroup = {
  id: ChGroupId
  label: string
  accent: string
  icon: ReactNode
  items: ChNavItem[]
}

const icon = (I: typeof DashboardOutlined) => createElement(I)

export const CH_NAV_GROUPS: ChNavGroup[] = [
  {
    id: 'operacao',
    label: 'Operação',
    accent: '#2563EB',
    icon: icon(ControlOutlined),
    items: [
      {
        tab: 'overview',
        label: 'Visão geral',
        description: 'Alertas derivados e KPIs de saúde do sistema.',
        icon: icon(DashboardOutlined),
      },
      {
        tab: 'issues',
        label: 'Issues',
        description: 'Fila de investigação e correlação com automations.',
        icon: icon(FlagOutlined),
      },
      {
        tab: 'sync',
        label: 'Sync',
        description: 'Jobs de integração, fail rate e jobs travados.',
        icon: icon(SyncOutlined),
      },
      {
        tab: 'infra',
        label: 'Infra',
        description: 'API, Postgres, stack local e probe.',
        icon: icon(CloudServerOutlined),
      },
    ],
  },
  {
    id: 'produto',
    label: 'Produto',
    accent: '#059669',
    icon: icon(AppstoreOutlined),
    items: [
      {
        tab: 'produto',
        label: 'Ciclo de vida',
        description: 'Estágio e entregas de capacidades no produto.',
        icon: icon(DeploymentUnitOutlined),
      },
      {
        tab: 'product',
        label: 'Produto e UX',
        description: 'Erros de cliente, features e matriz acesso × falha.',
        icon: icon(ExperimentOutlined),
      },
      {
        tab: 'support',
        label: 'Suporte',
        description: 'Chamados «Reportar problema» e triagem.',
        icon: icon(CustomerServiceOutlined),
      },
    ],
  },
  {
    id: 'negocio',
    label: 'Negócio',
    accent: '#D97706',
    icon: icon(FundOutlined),
    items: [
      {
        tab: 'business',
        label: 'Negócio',
        description: 'Métricas agregadas de ativação, sync e billing.',
        icon: icon(BarChartOutlined),
      },
      {
        tab: 'strategy',
        label: 'Estratégia',
        description: 'Leitura advisory Marketing, Financeiro e CX.',
        icon: icon(ReadOutlined),
      },
    ],
  },
  {
    id: 'plataforma',
    label: 'Plataforma',
    accent: '#7C3AED',
    icon: icon(ApiOutlined),
    items: [
      {
        tab: 'ava',
        label: 'Ava e LLM',
        description: 'Turnos, cascade, tokens e sinais Ava.',
        icon: icon(RobotOutlined),
      },
      {
        tab: 'cost',
        label: 'Custo interno',
        description: 'Orçamento do classificador e teto interno.',
        icon: icon(WalletOutlined),
      },
    ],
  },
]

const TAB_TO_GROUP = new Map<ChTabKey, ChGroupId>()
for (const g of CH_NAV_GROUPS) {
  for (const item of g.items) {
    TAB_TO_GROUP.set(item.tab, g.id)
  }
}

export const CH_TAB_KEYS: ChTabKey[] = [...TAB_TO_GROUP.keys()]

export function isChTabKey(value: string | null): value is ChTabKey {
  return value != null && TAB_TO_GROUP.has(value as ChTabKey)
}

export function tabToGroup(tab: ChTabKey): ChGroupId {
  return TAB_TO_GROUP.get(tab) ?? 'operacao'
}

export function getGroup(id: ChGroupId): ChNavGroup {
  return CH_NAV_GROUPS.find((g) => g.id === id) ?? CH_NAV_GROUPS[0]
}

export function getNavItem(tab: ChTabKey): ChNavItem | undefined {
  for (const g of CH_NAV_GROUPS) {
    const item = g.items.find((i) => i.tab === tab)
    if (item) return item
  }
  return undefined
}

const GROUP_STORAGE_KEY = 'ch-active-group'
const TAB_STORAGE_KEY = 'ops-console-active-tab'
const GROUP_TAB_SESSION_PREFIX = 'ch-last-tab-'

export function readNavFromUrl(): { group: ChGroupId; tab: ChTabKey } {
  const params = new URLSearchParams(window.location.search)
  const tabParam = params.get('tab')
  const groupParam = params.get('group') as ChGroupId | null

  if (params.get('investigationId')) {
    return { group: 'operacao', tab: 'issues' }
  }

  if (isChTabKey(tabParam)) {
    const group = groupParam && CH_NAV_GROUPS.some((g) => g.id === groupParam)
      ? groupParam
      : tabToGroup(tabParam)
    return { group, tab: tabParam }
  }

  const savedTab = localStorage.getItem(TAB_STORAGE_KEY)
  if (isChTabKey(savedTab)) {
    const group =
      (localStorage.getItem(GROUP_STORAGE_KEY) as ChGroupId | null) ?? tabToGroup(savedTab)
    return { group: CH_NAV_GROUPS.some((g) => g.id === group) ? group : tabToGroup(savedTab), tab: savedTab }
  }

  return { group: 'operacao', tab: 'overview' }
}

export function writeNavToUrl(group: ChGroupId, tab: ChTabKey, extra?: Record<string, string>) {
  const params = new URLSearchParams(window.location.search)
  if (params.get('mock') === 'ch-layout') {
    params.set('mock', 'ch-layout')
  }
  params.set('group', group)
  params.set('tab', tab)
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      params.set(k, v)
    }
  } else if (tab !== 'strategy') {
    params.delete('strategy')
  }
  const qs = params.toString()
  window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`)
}

export function persistNav(group: ChGroupId, tab: ChTabKey) {
  localStorage.setItem(GROUP_STORAGE_KEY, group)
  localStorage.setItem(TAB_STORAGE_KEY, tab)
  sessionStorage.setItem(`${GROUP_TAB_SESSION_PREFIX}${group}`, tab)
}

export function lastTabForGroup(group: ChGroupId): ChTabKey {
  const saved = sessionStorage.getItem(`${GROUP_TAB_SESSION_PREFIX}${group}`)
  if (isChTabKey(saved)) return saved
  return getGroup(group).items[0]?.tab ?? 'overview'
}

export function isChLayoutMock(): boolean {
  return new URLSearchParams(window.location.search).get('mock') === 'ch-layout'
}
