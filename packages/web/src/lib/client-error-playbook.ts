/**
 * Playbooks Nível 1 — mensagem amigável sem expor detalhe técnico.
 * Mapa feature × error_code → texto UI.
 */
const FEATURE_MESSAGES: Record<string, Record<string, string>> = {
  patient_context: {
    default: 'Não foi possível atualizar o resumo clínico. Tente recarregar a página.',
    HTTP_503: 'O resumo clínico está temporariamente indisponível.',
  },
  patient_detail: {
    default: 'Não conseguimos carregar os dados do paciente.',
    HTTP_404: 'Paciente não encontrado ou sem permissão.',
  },
  integrations: {
    default: 'Não conseguimos carregar as integrações.',
    HTTP_503: 'Integrações temporariamente indisponíveis.',
  },
  billing: {
    default: 'Não conseguimos abrir a área de plano e pagamento.',
    HTTP_503: 'Pagamentos temporariamente indisponíveis.',
  },
  dashboard: {
    default: 'Não conseguimos carregar a lista de pacientes.',
  },
  onboarding: {
    default: 'Não conseguimos salvar seu perfil. Tente novamente.',
  },
  ui: {
    default: 'Algo inesperado aconteceu nesta página.',
    ReactError: 'Um componente da página falhou. Recarregue ou tente outra aba.',
  },
  api: {
    default: 'Não conseguimos completar a ação. Tente novamente em instantes.',
    HTTP_401: 'Sua sessão expirou. Faça login novamente.',
    HTTP_403: 'Você não tem permissão para esta ação.',
    HTTP_404: 'Recurso não encontrado.',
    HTTP_503: 'Serviço temporariamente indisponível.',
    NETWORK: 'Sem conexão com o servidor. Verifique sua internet.',
  },
}

const GLOBAL_HTTP: Record<string, string> = {
  HTTP_401: 'Sua sessão expirou. Faça login novamente.',
  HTTP_403: 'Você não tem permissão para esta ação.',
  HTTP_503: 'Serviço temporariamente indisponível. Tente em alguns minutos.',
  NETWORK: 'Sem conexão com o servidor. Verifique sua internet.',
}

export function getClientErrorPlaybookMessage(
  feature: string,
  errorCode: string,
): string {
  const code = errorCode.startsWith('HTTP_') || errorCode === 'NETWORK' || errorCode === 'ReactError'
    ? errorCode
    : 'default'
  const featureMap = FEATURE_MESSAGES[feature]
  if (featureMap?.[code]) return featureMap[code]
  if (featureMap?.default) return featureMap.default
  if (GLOBAL_HTTP[code]) return GLOBAL_HTTP[code]
  if (feature.startsWith('api:')) {
    return FEATURE_MESSAGES.api[code] ?? FEATURE_MESSAGES.api.default
  }
  return FEATURE_MESSAGES.ui.default
}
