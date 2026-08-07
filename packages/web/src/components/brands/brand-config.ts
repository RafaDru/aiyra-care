/** Metadados visuais de operadoras, integrações e hospitais. */
export type BrandKey =
  | 'unimed'
  | 'amil'
  | 'bradesco_saude'
  | 'conectesus'
  | 'caderneta'
  | 'mater_dei'

export interface BrandMeta {
  key: BrandKey
  label: string
  shortLabel: string
  subtitle: string
  /** Gradiente do cartão digital */
  gradient: string
  accent: string
  /** Cor sólida para tags / chips */
  color: string
  logoSrc?: string
}

export const BRANDS: Record<BrandKey, BrandMeta> = {
  unimed: {
    key: 'unimed',
    label: 'Unimed BH',
    shortLabel: 'Unimed',
    subtitle: 'Cooperativa de saúde',
    gradient: 'linear-gradient(135deg, #004e4a 0%, #00995d 55%, #00a884 100%)',
    accent: '#b8f5e0',
    color: '#00995d',
    logoSrc: '/brands/unimed.svg',
  },
  amil: {
    key: 'amil',
    label: 'Amil',
    shortLabel: 'Amil',
    subtitle: 'Plano de saúde',
    gradient: 'linear-gradient(135deg, #003da5 0%, #0066cc 55%, #00a3e0 100%)',
    accent: '#cce5ff',
    color: '#0066cc',
    logoSrc: '/brands/amil.svg',
  },
  bradesco_saude: {
    key: 'bradesco_saude',
    label: 'Bradesco Saúde',
    shortLabel: 'Bradesco',
    subtitle: 'Plano de saúde',
    gradient: 'linear-gradient(135deg, #8b0000 0%, #cc092f 55%, #e85d04 100%)',
    accent: '#ffd6d6',
    color: '#cc092f',
    logoSrc: '/brands/bradesco.svg',
  },
  conectesus: {
    key: 'conectesus',
    label: 'Cartão Nacional de Saúde',
    shortLabel: 'SUS',
    subtitle: 'ConecteSUS',
    gradient: 'linear-gradient(135deg, #135e31 0%, #1a7a42 50%, #2ea043 100%)',
    accent: '#d1fae5',
    color: '#135e31',
    logoSrc: '/brands/sus.svg',
  },
  caderneta: {
    key: 'caderneta',
    label: 'Caderneta da Criança',
    shortLabel: 'Caderneta',
    subtitle: 'Ministério da Saúde',
    gradient: 'linear-gradient(135deg, #003d8f 0%, #0054e9 45%, #1a73e8 100%)',
    accent: '#cce5ff',
    color: '#0054e9',
    logoSrc: '/brands/sus.svg',
  },
  mater_dei: {
    key: 'mater_dei',
    label: 'Mater Dei',
    shortLabel: 'Mater Dei',
    subtitle: 'Rede hospitalar',
    gradient: 'linear-gradient(135deg, #4a148c 0%, #7b1fa2 45%, #00897b 100%)',
    accent: '#e1bee7',
    color: '#7b1fa2',
    logoSrc: '/brands/materdei.png',
  },
}

export function brandForPortal(portalType: string): BrandMeta | undefined {
  return BRANDS[portalType as BrandKey]
}

export function brandOrFallback(portalType: string): BrandMeta {
  return brandForPortal(portalType) ?? {
    key: 'unimed',
    label: portalType,
    shortLabel: portalType,
    subtitle: 'Integração',
    gradient: 'linear-gradient(135deg, #334155 0%, #64748b 100%)',
    accent: '#e2e8f0',
    color: '#475569',
  }
}
