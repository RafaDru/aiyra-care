const FEATURE_MESSAGES: Record<string, Record<string, string>> = {
  settings: {
    default: 'Não foi possível abrir as configurações. Tente fechar e abrir o app.',
    ReactError: 'A tela de configurações falhou. Volte ao início e tente de novo.',
  },
  dashboard: {
    default: 'Não conseguimos carregar sua família.',
  },
  patient_detail: {
    default: 'Não conseguimos carregar o perfil.',
  },
  mobile_shell: {
    default: 'Algo inesperado aconteceu no app.',
    ReactError: 'Um componente falhou. Feche e abra o app ou volte à tela anterior.',
  },
  ui: {
    default: 'Algo inesperado aconteceu nesta tela.',
    ReactError: 'Um componente da tela falhou. Volte ou reinicie o app.',
  },
  api: {
    default: 'Não conseguimos completar a ação. Tente novamente.',
    HTTP_503: 'Serviço temporariamente indisponível.',
    NETWORK: 'Sem conexão com o servidor. Verifique sua internet.',
  },
}

const GLOBAL_HTTP: Record<string, string> = {
  HTTP_401: 'Sua sessão expirou. Faça login novamente.',
  HTTP_503: 'Serviço temporariamente indisponível. Tente em alguns minutos.',
  NETWORK: 'Sem conexão com o servidor. Verifique sua internet.',
}

export function getClientErrorPlaybookMessage(feature: string, errorCode: string): string {
  const code =
    errorCode.startsWith('HTTP_') || errorCode === 'NETWORK' || errorCode === 'ReactError' ? errorCode : 'default'
  const featureMap = FEATURE_MESSAGES[feature]
  if (featureMap?.[code]) return featureMap[code]
  if (featureMap?.default) return featureMap.default
  if (GLOBAL_HTTP[code]) return GLOBAL_HTTP[code]
  if (feature.startsWith('api:')) {
    return FEATURE_MESSAGES.api[code] ?? FEATURE_MESSAGES.api.default
  }
  return FEATURE_MESSAGES.mobile_shell.default
}
