export type PortalAuthFailureKind =
  | 'credentials_invalid'
  | 'session_expired'
  | 'interactive_required'
  | 'portal_blocked'
  | 'timeout'
  | 'unknown'

export type PortalAuthAttention = 'none' | 'credentials' | 'session'

const CREDENTIALS_RE =
  /senha|credencial|incorret|inv[aá]lid|wrong password|invalid user credentials|cpf\/c[oó]digo ou senha/i
const SESSION_RE =
  /401|403|sess[aã]o|token|expirad|invalid[_\s-]?grant|not active|rejeitado|unauthorized|reautent/i
const INTERACTIVE_RE =
  /otp|c[oó]digo sms|whatsapp|login manual|abra o chrome|navegador|gov\.br|complete o login/i
const BLOCKED_RE = /bloquead|waf|captcha|acesso negado|forbidden.*portal/i
const TIMEOUT_RE = /timeout|expirou \(timeout\)|timed out/i

export function classifyPortalAuthFailure(
  message: string,
  httpStatus?: number,
): PortalAuthFailureKind {
  const m = message.trim()
  if (!m) return 'unknown'
  if (TIMEOUT_RE.test(m)) return 'timeout'
  if (httpStatus === 401 || httpStatus === 403) {
    if (CREDENTIALS_RE.test(m)) return 'credentials_invalid'
    return 'session_expired'
  }
  if (CREDENTIALS_RE.test(m) && !SESSION_RE.test(m)) return 'credentials_invalid'
  if (INTERACTIVE_RE.test(m)) return 'interactive_required'
  if (SESSION_RE.test(m)) return 'session_expired'
  if (BLOCKED_RE.test(m)) return 'portal_blocked'
  return 'unknown'
}

export function authAttentionFromFailure(kind: PortalAuthFailureKind): PortalAuthAttention {
  switch (kind) {
    case 'credentials_invalid':
      return 'credentials'
    case 'session_expired':
    case 'interactive_required':
      return 'session'
    default:
      return 'none'
  }
}

export function userMessageForAuthFailure(
  portalType: string,
  kind: PortalAuthFailureKind,
  fallback?: string,
): string {
  const portal = portalLabel(portalType)
  switch (kind) {
    case 'credentials_invalid':
      return `${portal}: senha ou login incorretos — atualize as credenciais em Integrações.`
    case 'session_expired':
      return `${portal}: sessão expirada — clique em Sincronizar para reconectar.`
    case 'interactive_required':
      return `${portal}: login interativo necessário — clique em Sincronizar e complete no navegador.`
    case 'portal_blocked':
      return `${portal}: portal indisponível ou bloqueou o acesso — tente mais tarde ou sincronize manualmente.`
    case 'timeout':
      return `${portal}: sincronização expirou — tente novamente; se persistir, use Sincronizar com force.`
    default:
      return fallback ?? `${portal}: falha na sincronização.`
  }
}

function portalLabel(portalType: string): string {
  switch (portalType) {
    case 'unimed': return 'Unimed BH'
    case 'amil': return 'Amil'
    case 'mater_dei': return 'Mater Dei'
    case 'hermes_pardini': return 'Grupo Fleury'
    case 'bradesco_saude': return 'Bradesco Saúde'
    default: return portalType
  }
}
