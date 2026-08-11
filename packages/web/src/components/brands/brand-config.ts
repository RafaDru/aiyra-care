/** Metadados visuais de operadoras, integrações e hospitais. */
export type BrandKey =
  | 'unimed'
  | 'amil'
  | 'bradesco_saude'
  | 'conectesus'
  | 'caderneta'
  | 'mater_dei'
  | 'hermes_pardini'

export interface BrandLogoFrame {
  width: number
  height: number
}

export interface BrandMeta {
  key: BrandKey
  label: string
  shortLabel: string
  subtitle: string
  /** Gradiente do cartão digital (corpo abaixo do header) */
  gradient: string
  accent: string
  /** Cor sólida para tags / chips */
  color: string
  cardTextColor?: string
  cardMutedColor?: string
  logoSrc?: string
  logoSquare?: string
  logoBanner?: string
  /** Fundo do container do logo (amostrado do asset) */
  logoBg?: string
  /** Faixa superior da carteirinha */
  cardHeaderBg?: string
  /** Altura máxima do logo na faixa da carteirinha */
  cardHeaderLogoMaxHeight?: number
  /** Container em listas/tags — evita crop circular */
  logoFrame?: BrandLogoFrame
  /** Avatar na aba Integrações (pode diferir de tags/carteira) */
  integrationsAvatar?: {
    src?: string
    bg?: string
    fit?: 'contain' | 'cover'
    frame?: BrandLogoFrame
    /** Com fit=cover: alinhamento do crop (ex. top se sobra altura) */
    objectPosition?: string
  }
}

export const BRANDS: Record<BrandKey, BrandMeta> = {
  unimed: {
    key: 'unimed',
    label: 'Unimed BH',
    shortLabel: 'Unimed',
    subtitle: 'Cooperativa de saúde',
    gradient: 'linear-gradient(180deg, #007a52 0%, #00995d 100%)',
    accent: '#b8f5e0',
    color: '#00995d',
    logoSrc: '/brands/unimed-square.png',
    logoSquare: '/brands/unimed-square.png',
    logoBanner: '/brands/unimed-square.png',
    logoBg: '#00995d',
    cardHeaderBg: '#00995d',
    cardHeaderLogoMaxHeight: 48,
    logoFrame: { width: 48, height: 48 },
    integrationsAvatar: {
      src: '/brands/unimed-square.png',
      bg: '#00995d',
      fit: 'cover',
      frame: { width: 48, height: 48 },
    },
  },
  amil: {
    key: 'amil',
    label: 'Amil',
    shortLabel: 'Amil',
    subtitle: 'Plano de saúde',
    gradient: 'linear-gradient(180deg, #4a5bc4 0%, #5b6fd6 100%)',
    accent: '#e8ecff',
    color: '#5b6fd6',
    logoSrc: '/brands/amil-logo.png',
    logoSquare: '/brands/amil-square.png',
    logoBanner: '/brands/amil-square.png',
    logoBg: '#4F14FF',
    cardHeaderBg: '#4F14FF',
    cardHeaderLogoMaxHeight: 44,
    logoFrame: { width: 48, height: 48 },
    integrationsAvatar: {
      bg: '#4F14FF',
      fit: 'cover',
      frame: { width: 48, height: 48 },
    },
  },
  bradesco_saude: {
    key: 'bradesco_saude',
    label: 'Bradesco Saúde',
    shortLabel: 'Bradesco',
    subtitle: 'Plano de saúde',
    gradient: 'linear-gradient(180deg, #a00820 0%, #cc092f 100%)',
    accent: '#ffd6d6',
    color: '#cc092f',
    logoSrc: '/brands/bradesco.svg',
    logoSquare: '/brands/bradesco.svg',
    logoBanner: '/brands/bradesco.svg',
    logoBg: '#cc092f',
    cardHeaderBg: '#cc092f',
    cardHeaderLogoMaxHeight: 32,
    logoFrame: { width: 80, height: 40 },
  },
  conectesus: {
    key: 'conectesus',
    label: 'Cartão Nacional de Saúde',
    shortLabel: 'SUS',
    subtitle: 'ConecteSUS',
    gradient: 'linear-gradient(180deg, #eef3f8 0%, #f8fafc 100%)',
    accent: '#00599c',
    color: '#00599c',
    logoSrc: '/brands/sus-logo.png',
    logoSquare: '/brands/conectesus-icon.png',
    logoBanner: '/brands/sus-logo.png',
    logoBg: '#0a1628',
    cardHeaderBg: '#f5f8fc',
    cardHeaderLogoMaxHeight: 40,
    cardTextColor: '#1e293b',
    cardMutedColor: '#00599c',
    logoFrame: { width: 48, height: 48 },
    integrationsAvatar: {
      bg: '#0a1628',
      fit: 'cover',
      frame: { width: 48, height: 48 },
    },
  },
  caderneta: {
    key: 'caderneta',
    label: 'Caderneta da Criança',
    shortLabel: 'Caderneta',
    subtitle: 'Meu SUS Digital',
    gradient: 'linear-gradient(180deg, #0d2847 0%, #135e31 100%)',
    accent: '#b8f5d0',
    color: '#135e31',
    logoSrc: '/brands/caderneta-sus-logo.png',
    logoSquare: '/brands/caderneta-sus-logo.png',
    logoBanner: '/brands/caderneta-sus-logo.png',
    logoBg: '#4c5da1',
    cardHeaderBg: '#4c5da1',
    cardHeaderLogoMaxHeight: 48,
    logoFrame: { width: 48, height: 48 },
    integrationsAvatar: {
      bg: '#4c5da1',
      fit: 'contain',
      frame: { width: 48, height: 48 },
    },
  },
  mater_dei: {
    key: 'mater_dei',
    label: 'Mater Dei',
    shortLabel: 'Mater Dei',
    subtitle: 'Rede de Saúde',
    gradient: 'linear-gradient(180deg, #178a7d 0%, #1f9485 100%)',
    accent: '#d4f0ec',
    color: '#1f9485',
    logoSrc: '/brands/materdei-logo.png',
    logoSquare: '/brands/materdei-square.jpg',
    logoBanner: '/brands/materdei-banner.png',
    logoBg: '#1f9485',
    cardHeaderBg: '#1f9485',
    cardHeaderLogoMaxHeight: 40,
    logoFrame: { width: 48, height: 48 },
    integrationsAvatar: {
      src: '/brands/materdei-square.jpg',
      bg: '#1f9485',
      fit: 'cover',
      frame: { width: 48, height: 48 },
    },
  },
  hermes_pardini: {
    key: 'hermes_pardini',
    label: 'Hermes Pardini',
    shortLabel: 'Pardini',
    subtitle: 'Laboratório',
    gradient: 'linear-gradient(180deg, #525252 0%, #6b6b6b 100%)',
    accent: '#fce4ec',
    color: '#e91e8c',
    logoSrc: '/brands/hermes-pardini.png',
    logoSquare: '/brands/hermes-pardini.png',
    logoBanner: '/brands/hermes-pardini.png',
    logoBg: '#d21e48',
    cardHeaderBg: '#d21e48',
    cardHeaderLogoMaxHeight: 44,
    logoFrame: { width: 48, height: 48 },
    integrationsAvatar: {
      bg: '#d21e48',
      fit: 'contain',
      frame: { width: 48, height: 48 },
    },
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
    logoBg: '#64748b',
    logoFrame: { width: 48, height: 48 },
  }
}

export function brandLogoForVariant(
  meta: BrandMeta,
  variant: 'avatar' | 'inline' | 'banner' | 'cardHeader',
): string | undefined {
  if (variant === 'cardHeader') return meta.logoBanner ?? meta.logoSquare ?? meta.logoSrc
  if (variant === 'avatar') return meta.logoSquare ?? meta.logoSrc
  if (variant === 'banner') return meta.logoBanner ?? meta.logoSrc
  return meta.logoSrc ?? meta.logoSquare
}

export function brandLogoFrameSize(meta: BrandMeta, size?: number): BrandLogoFrame {
  if (meta.logoFrame) return meta.logoFrame
  const s = size ?? 48
  return { width: s, height: s }
}

export function brandAvatarBorderRadius(width: number, height: number): number {
  const min = Math.min(width, height)
  return Math.min(12, Math.max(8, Math.round(min * 0.22)))
}

export function shrinkLogoFrame(frame: BrandLogoFrame, maxDim: number): BrandLogoFrame {
  const scale = maxDim / Math.max(frame.width, frame.height)
  return {
    width: Math.max(16, Math.round(frame.width * scale)),
    height: Math.max(16, Math.round(frame.height * scale)),
  }
}

export function resolveAvatarDisplay(
  meta: BrandMeta,
  context: 'default' | 'integrations',
  variantSrc: string | undefined,
): {
  src: string | undefined
  bg: string
  fit: 'contain' | 'cover'
  frame: BrandLogoFrame
  objectPosition: string
} {
  const ia = context === 'integrations' ? meta.integrationsAvatar : undefined
  const frame = ia?.frame ?? brandLogoFrameSize(meta)
  return {
    src: ia?.src ?? variantSrc,
    bg: ia?.bg ?? meta.logoBg ?? '#ffffff',
    fit: ia?.fit ?? 'contain',
    frame,
    objectPosition: ia?.objectPosition ?? 'center center',
  }
}
