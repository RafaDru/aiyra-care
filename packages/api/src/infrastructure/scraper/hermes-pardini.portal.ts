/** Hermes Pardini — portal de resultados via Precision Care (Grupo Fleury). */

export type HermesPardiniRegion = 'mg' | 'sp'

/** Loja Magento regional (agendamento/compras — não é portal de laudos). */
export const HERMES_PARDINI_MAGENTO_ORIGINS: Record<HermesPardiniRegion, string> = {
  mg: 'https://www.hermespardini.com.br/lojavirtual',
  sp: 'https://www.hermespardini.com.br/lojavirtual-sp',
}

export const HERMES_PARDINI_PRECISION_CARE = {
  portalOrigin: 'https://resultados.grupofleury.com.br',
  portalEntryUrl: 'https://resultados.grupofleury.com.br/?origin=pardini',
  spaBase: 'https://resultados.grupofleury.com.br/precision-care',
  bffBase: 'https://api-plataforma.grupofleury.com.br/precision-care/api',
  keycloak: {
    base: 'https://sso.grupofleury.com.br/auth',
    realm: 'grupopardini',
    clientId: 'precision_care_pardini',
    tokenUrl:
      'https://sso.grupofleury.com.br/auth/realms/grupopardini/protocol/openid-connect/token',
    userInfoUrl:
      'https://sso.grupofleury.com.br/auth/realms/grupopardini/protocol/openid-connect/userinfo',
    authUrl:
      'https://sso.grupofleury.com.br/auth/realms/grupopardini/protocol/openid-connect/auth',
  },
} as const

export function hermesPardiniMagentoOrigin(region: HermesPardiniRegion = 'mg'): string {
  return HERMES_PARDINI_MAGENTO_ORIGINS[region]
}

export function hermesPardiniMagentoLoginUrl(region: HermesPardiniRegion = 'mg'): string {
  return `${hermesPardiniMagentoOrigin(region)}/customer/account/login/`
}

export function hermesPardiniPortalEntryUrl(): string {
  return HERMES_PARDINI_PRECISION_CARE.portalEntryUrl
}

export function resolveHermesPardiniRegion(): HermesPardiniRegion {
  const raw = (process.env.HERMES_PARDINI_REGION ?? 'mg').toLowerCase()
  return raw === 'sp' ? 'sp' : 'mg'
}

/** Caminhos candidatos no BFF — validados com 401 (existem) até mapear o payload real. */
export const HERMES_PARDINI_BFF_EXAM_CANDIDATES = [
  '/v1/exames',
  '/v1/exams',
  '/v1/resultados',
  '/v1/results',
  '/v1/paciente/exames',
  '/v1/patient/exams',
] as const
