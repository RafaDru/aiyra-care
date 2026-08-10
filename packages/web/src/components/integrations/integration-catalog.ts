import type { BrandKey } from '../brands/brand-config.js'

export type LinkablePortal = 'unimed' | 'amil' | 'bradesco_saude' | 'mater_dei' | 'hermes_pardini'

export type IntegrationAction = 'link' | 'conectesus' | 'caderneta'

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
  },
  {
    id: 'hermes_pardini',
    groupId: 'laboratory',
    brand: 'hermes_pardini',
    title: 'Hermes Pardini',
    description: 'Resultados de exames — CPF ou código do cliente + senha do protocolo',
    action: 'link',
    portalType: 'hermes_pardini',
    enabled: true,
  },
  {
    id: 'conectesus',
    groupId: 'public',
    brand: 'conectesus',
    title: 'ConecteSUS',
    description: 'Importar vacinas e exames do SUS (login gov.br)',
    action: 'conectesus',
    enabled: true,
  },
  {
    id: 'caderneta',
    groupId: 'public',
    brand: 'caderneta',
    title: 'Caderneta da Criança',
    description: 'Minha Família, calendário vacinal previsto/aplicado, marcos e histórico (gov.br)',
    action: 'caderneta',
    enabled: true,
  },
]

export function groupIntegrationOptions(
  linkedPortals: Set<string>,
): Array<IntegrationGroup & { options: Array<IntegrationOption & { linked: boolean }> }> {
  return INTEGRATION_GROUPS.map((group) => ({
    ...group,
    options: INTEGRATION_OPTIONS
      .filter((o) => o.groupId === group.id)
      .map((o) => ({
        ...o,
        linked: o.portalType != null && linkedPortals.has(o.portalType),
      })),
  })).filter((g) => g.options.length > 0)
}

export type PublicHealthPortal = 'conectesus' | 'caderneta'

export function getIntegrationOption(id: string): IntegrationOption | undefined {
  return INTEGRATION_OPTIONS.find((o) => o.id === id)
}

export function isPublicHealthPortal(id: string): id is PublicHealthPortal {
  return id === 'conectesus' || id === 'caderneta'
}
