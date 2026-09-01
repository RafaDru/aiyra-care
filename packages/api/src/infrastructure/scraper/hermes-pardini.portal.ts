/** Hermes Pardini — portal de resultados via Precision Care (Grupo Fleury). */

export type HermesPardiniRegion = 'mg' | 'sp'

/** Marcas no ecossistema Precision Care — headers para GET /pedidos (PoC multi-marca). */
export type FleuryPrecisionMarcaKey = 'pardini' | 'fleury' | 'a_mais' | 'labs_a' | 'none'

export const FLEURY_PRECISION_MARCA_PROFILES: Record<
  FleuryPrecisionMarcaKey,
  Record<string, string>
> = {
  pardini: {
    'marca-selecionada': 'pardini',
    'marca-origem': 'pardini',
    grupo: 'grupo-pardini',
  },
  fleury: {
    'marca-selecionada': 'fleury',
    'marca-origem': 'fleury',
    grupo: 'grupo-fleury',
  },
  a_mais: {
    'marca-selecionada': 'a+',
    'marca-origem': 'a+',
    grupo: 'grupo-fleury',
  },
  labs_a: {
    'marca-selecionada': 'labs-a+',
    'marca-origem': 'labs-a+',
    grupo: 'grupo-fleury',
  },
  none: {},
}

export const FLEURY_PRECISION_MARCA_PROBE_ORDER: FleuryPrecisionMarcaKey[] = [
  'pardini',
  'fleury',
  'a_mais',
  'labs_a',
  'none',
]

/** Loja Magento regional (agendamento/compras — não é portal de laudos). */
export const HERMES_PARDINI_MAGENTO_ORIGINS: Record<HermesPardiniRegion, string> = {
  mg: 'https://www.hermespardini.com.br/lojavirtual',
  sp: 'https://www.hermespardini.com.br/lojavirtual-sp',
}

export const HERMES_PARDINI_PRECISION_CARE = {
  portalOrigin: 'https://resultados.grupofleury.com.br',
  portalEntryUrl: 'https://resultados.grupofleury.com.br/?origin=pardini',
  unifiedEntryUrl: 'https://resultados.grupofleury.com.br',
  spaBase: 'https://resultados.grupofleury.com.br/precision-care',
  /** Shell BFF (produtos, config) — exames estão no microfrontend portalpaciente. */
  bffBase: 'https://api-plataforma.grupofleury.com.br/precision-care/api',
  /** API do portal paciente (lista de pedidos + exames por pedido). */
  pacienteApiBase: 'https://api-plataforma.grupofleury.com.br/precision-care/paciente/api/v1',
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

/** Entrada unificada Precision Care (sem `origin=pardini`) — login OTP SMS/e-mail/WhatsApp. */
export function fleuryPrecisionUnifiedEntryUrl(): string {
  return HERMES_PARDINI_PRECISION_CARE.unifiedEntryUrl
}

/** Lista de exames no microfrontend portalpaciente (dispara GET /pedidos). */
export function hermesPardiniResultadosExameUrl(): string {
  return `${HERMES_PARDINI_PRECISION_CARE.portalOrigin}/pardini/portalpaciente/resultadosExame`
}

export function resolveHermesPardiniRegion(): HermesPardiniRegion {
  const raw = (process.env.HERMES_PARDINI_REGION ?? 'mg').toLowerCase()
  return raw === 'sp' ? 'sp' : 'mg'
}

/** Tamanho de página na UI; sync usa lote maior para menos round-trips. */
export const HERMES_PARDINI_PEDIDOS_PAGE_SIZE = 50

/** Sync manual: portal unificado Grupo Fleury (OTP). `0` = entrada legada `?origin=pardini`. */
export function hermesPardiniUseUnifiedLogin(): boolean {
  const raw = process.env.FLEURY_PRECISION_UNIFIED_LOGIN?.trim().toLowerCase()
  if (raw === '0' || raw === 'false' || raw === 'no') return false
  return true
}

/** Em entrada unificada, preencher senha do protocolo automaticamente (default: só OTP no Chrome). */
export function hermesPardiniAllowPasswordOnUnified(): boolean {
  return process.env.FLEURY_PRECISION_PASSWORD_ON_UNIFIED === '1'
}

/** Timeout do browser aguardando OTP + GET /pedidos (ms). */
export function fleuryPrecisionOtpTimeoutMs(): number {
  const n = Number(process.env.FLEURY_PRECISION_OTP_TIMEOUT_MS ?? '180000')
  if (!Number.isFinite(n) || n < 60_000) return 180_000
  return Math.min(n, 600_000)
}
