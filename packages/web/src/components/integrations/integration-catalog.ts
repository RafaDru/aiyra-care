import type { BrandKey } from '../brands/brand-config.js'
import {
  FLEURY_GROUP_DESCRIPTION,
  FLEURY_GROUP_FULL_LABEL,
  FLEURY_GROUP_SEARCH_ALIASES,
  FLEURY_LAB_BRANDS,
  matchesFleurySearch,
} from '../brands/fleury-group-config.js'

export type LinkablePortal = 'unimed' | 'amil' | 'bradesco_saude' | 'mater_dei' | 'hermes_pardini'

export type IntegrationAction = 'link' | 'conectesus' | 'caderneta'

export type IntegrationPresentation = 'default' | 'fleury_group'

export interface IntegrationOption {
  id: string
  groupId: IntegrationGroupId
  brand: BrandKey
  title: string
  description: string
  action: IntegrationAction
  portalType?: LinkablePortal
  /** false = exibir desabilitado (ex.: odonto em breve) */
  enabled: boolean
  disabledReason?: string
  presentation?: IntegrationPresentation
  searchAliases?: string[]
}

export type IntegrationGroupId = 'public' | 'health' | 'dental' | 'hospital' | 'laboratory'

export interface IntegrationGroup {
  id: IntegrationGroupId
  title: string
  description: string
}

export const INTEGRATION_GROUPS: IntegrationGroup[] = [
  {
    id: 'health',
    title: 'Plano de saúde',
    description: 'Operadoras médicas — carteirinha, guias e utilização',
  },
  {
    id: 'dental',
    title: 'Plano odontológico',
    description: 'Operadoras dentais — em breve',
  },
  {
    id: 'hospital',
    title: 'Hospitais e clínicas',
    description: 'Portais de exames, laudos e atendimentos',
  },
  {
    id: 'laboratory',
    title: 'Laboratórios',
    description: 'Resultados de exames laboratoriais',
  },
  {
    id: 'public',
    title: 'Sistema público',
    description: 'Dados do SUS via gov.br',
  },
]

export const INTEGRATION_OPTIONS: IntegrationOption[] = [
  {
    id: 'unimed',
    groupId: 'health',
    brand: 'unimed',
    title: 'Unimed BH',
    description: 'Portal do cliente — extrato, autorizações e cartão virtual',
    action: 'link',
    portalType: 'unimed',
    enabled: true,
    searchAliases: ['unimed', 'bh', 'belo horizonte', 'cooperativa'],
  },
  {
    id: 'amil',
    groupId: 'health',
    brand: 'amil',
    title: 'Amil',
    description: 'Beneficiário — plano, guias e tokens',
    action: 'link',
    portalType: 'amil',
    enabled: true,
    searchAliases: ['amil', 'plano', 'beneficiário'],
  },
  {
    id: 'bradesco_saude',
    groupId: 'health',
    brand: 'bradesco_saude',
    title: 'Bradesco Saúde',
    description: 'Portal do segurado — em desenvolvimento',
    action: 'link',
    portalType: 'bradesco_saude',
    enabled: true,
    searchAliases: ['bradesco', 'saúde', 'segurado'],
  },
  {
    id: 'odonto_placeholder',
    groupId: 'dental',
    brand: 'amil',
    title: 'Operadoras odontológicas',
    description: 'OdontoPrev, MetLife Dental e similares',
    action: 'link',
    enabled: false,
    disabledReason: 'Em breve',
    searchAliases: ['odonto', 'dental', 'odontoprev'],
  },
  {
    id: 'mater_dei',
    groupId: 'hospital',
    brand: 'mater_dei',
    title: 'Meu Mater Dei',
    description: 'Exames, laudos, atendimentos e documentos clínicos',
    action: 'link',
    portalType: 'mater_dei',
    enabled: true,
    searchAliases: ['mater dei', 'hospital', 'bh'],
  },
  {
    id: 'fleury_precision',
    groupId: 'laboratory',
    brand: 'fleury_group',
    title: FLEURY_GROUP_FULL_LABEL,
    description: FLEURY_GROUP_DESCRIPTION,
    action: 'link',
    portalType: 'hermes_pardini',
    enabled: true,
    presentation: 'fleury_group',
    searchAliases: FLEURY_GROUP_SEARCH_ALIASES,
  },
  {
    id: 'conectesus',
    groupId: 'public',
    brand: 'conectesus',
    title: 'ConecteSUS',
    description: 'Reimportar vacinas e exames do SUS (gov.br — sessão salva após primeiro login)',
    action: 'conectesus',
    enabled: true,
    searchAliases: ['conectesus', 'sus', 'gov.br', 'vacina'],
  },
  {
    id: 'caderneta',
    groupId: 'public',
    brand: 'caderneta',
    title: 'Caderneta da Criança',
    description: 'Minha Família, calendário vacinal previsto/aplicado, marcos e histórico (gov.br)',
    action: 'caderneta',
    enabled: true,
    searchAliases: ['caderneta', 'criança', 'vacinal', 'família'],
  },
]

function optionSearchBlob(option: IntegrationOption): string {
  return [
    option.title,
    option.description,
    ...(option.searchAliases ?? []),
    option.presentation === 'fleury_group' ? FLEURY_LAB_BRANDS.map((b) => b.label).join(' ') : '',
  ].join(' ').toLowerCase()
}

export function matchesIntegrationSearch(option: IntegrationOption, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (option.presentation === 'fleury_group' && matchesFleurySearch(q)) return true
  return optionSearchBlob(option).includes(q)
}

export function groupIntegrationOptions(
  linkedPortals: Set<string>,
  searchQuery = '',
): Array<IntegrationGroup & { options: Array<IntegrationOption & { linked: boolean }> }> {
  return INTEGRATION_GROUPS.map((group) => ({
    ...group,
    options: INTEGRATION_OPTIONS
      .filter((o) => o.groupId === group.id)
      .filter((o) => matchesIntegrationSearch(o, searchQuery))
      .map((o) => ({
        ...o,
        linked: o.portalType != null && linkedPortals.has(o.portalType),
      })),
  })).filter((g) => g.options.length > 0)
}

export type PublicHealthPortal = 'conectesus' | 'caderneta'

export function getIntegrationOption(id: string): IntegrationOption | undefined {
  if (id === 'hermes_pardini') {
    return INTEGRATION_OPTIONS.find((o) => o.id === 'fleury_precision')
  }
  return INTEGRATION_OPTIONS.find((o) => o.id === id)
}

export function isPublicHealthPortal(id: string): id is PublicHealthPortal {
  return id === 'conectesus' || id === 'caderneta'
}
