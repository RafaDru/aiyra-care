import { getClientErrorPlaybookMessage } from '@/lib/client-error-playbook'

const DEDUPE_MS = 20_000
let lastKey = ''
let lastAt = 0

type ToastApi = { error: (message: string) => void }

/**
 * Aviso curto ao usuário (paridade web: playbook + telemetria separada).
 */
export function notifyServiceFailure(
  toast: ToastApi | null,
  feature: string,
  errorCode: string,
): void {
  if (!toast) return
  const key = `${feature}|${errorCode}`
  const now = Date.now()
  if (key === lastKey && now - lastAt < DEDUPE_MS) return
  lastKey = key
  lastAt = now
  toast.error(getClientErrorPlaybookMessage(feature, errorCode))
}
