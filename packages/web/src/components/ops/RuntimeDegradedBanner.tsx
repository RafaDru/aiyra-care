import { useEffect, useState } from 'react'
import { Alert } from 'antd'
import { getAccountFreshnessState, subscribeAccountFreshness } from '../../lib/account-freshness.js'

/** Banner global quando modo degradado (Ava lite, leitura D-1, sync portal). */
export function RuntimeDegradedBanner() {
  const [runtime, setRuntime] = useState(getAccountFreshnessState()?.runtime)

  useEffect(() => {
    const sync = () => setRuntime(getAccountFreshnessState()?.runtime)
    return subscribeAccountFreshness(sync)
  }, [])

  if (!runtime) return null

  const messages: string[] = []
  if (runtime.degradedRead) {
    messages.push(
      runtime.degradedReadAsOf
        ? `Alguns dados podem refletir o dia ${runtime.degradedReadAsOf} (modo de leitura simplificado).`
        : 'Alguns dados podem estar desatualizados (modo de leitura simplificado).',
    )
  }
  if (runtime.avaLite) {
    messages.push('Ava está em modo simplificado — respostas sem revisão automática.')
  }
  if (runtime.syncDegradedPortals.length) {
    messages.push(
      `Sincronização automática pausada para: ${runtime.syncDegradedPortals.join(', ')}. Use Sincronizar manualmente.`,
    )
  }

  if (!messages.length) return null

  return (
    <Alert
      type="warning"
      showIcon
      banner
      message="Serviço em modo de contingência"
      description={messages.join(' ')}
      style={{ marginBottom: 0 }}
    />
  )
}
