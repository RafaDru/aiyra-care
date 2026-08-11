import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import type { IntegrationLink, IntegrationLinkSyncStatus } from '../lib/api.types.js'
import { formatSyncNovelty } from '../lib/silent-sync.js'
import { useAuth } from '../contexts/AuthContext.js'

export type WalletLinkSyncMeta = {
  active: boolean
  message: string | null
  noveltyText: string | null
  lastSyncLabel: string | null
}

function formatLastSync(when: string | null | undefined): string | null {
  if (!when) return null
  return new Date(when).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function mapStatus(
  link: IntegrationLink,
  status: IntegrationLinkSyncStatus | null,
): WalletLinkSyncMeta {
  const active = status?.activeJob
  if (active) {
    return {
      active: true,
      message: active.message || 'Sincronizando…',
      noveltyText: null,
      lastSyncLabel: null,
    }
  }
  const last = status?.lastJob
  const novelty = formatSyncNovelty(last?.novelty ?? last?.result?.novelty)
  const when = link.effectiveLastSyncAt ?? link.lastSyncAt
  return {
    active: false,
    message: last?.status === 'failed' ? (last.error || last.message) : null,
    noveltyText: novelty,
    lastSyncLabel: formatLastSync(when),
  }
}

/**
 * Status discreto do último sync por vínculo (Carteira).
 * Pausa polling quando pause=true (ex.: sync silencioso em andamento na API).
 */
export function useWalletLinkSyncStatus(
  links: IntegrationLink[],
  refreshKey = 0,
  pausePolling = false,
) {
  const [byLinkId, setByLinkId] = useState<Record<string, WalletLinkSyncMeta>>({})
  const { loading: authLoading, session, configured: authConfigured } = useAuth()

  useEffect(() => {
    if (pausePolling) return
    if (authConfigured && (authLoading || !session)) return
    if (!links.length) {
      setByLinkId({})
      return
    }

    let cancelled = false
    const poll = async () => {
      try {
        const rows = await Promise.all(
          links.map(async (link) => {
            const linkId = link.effectiveSyncLinkId ?? link.id
            const status = await api.integrationLinks.syncStatus(linkId)
            return { linkId: link.id, meta: mapStatus(link, status) }
          }),
        )
        if (!cancelled) {
          setByLinkId(Object.fromEntries(rows.map((r) => [r.linkId, r.meta])))
        }
      } catch {
        // mantém último estado
      }
    }

    void poll()
    const id = window.setInterval(poll, 30_000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [links, refreshKey, pausePolling, authLoading, session, authConfigured])

  return byLinkId
}
