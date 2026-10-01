import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import type { IntegrationLink, IntegrationLinkSyncStatus } from '@/lib/api.types'
import { formatSyncNovelty } from '@/lib/silent-sync'

export type LinkSyncMeta = {
  active: boolean
  message: string | null
  noveltyText: string | null
  lastSyncLabel: string | null
  lastStatus: 'success' | 'failed' | null
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

function mapStatus(link: IntegrationLink, status: IntegrationLinkSyncStatus | null): LinkSyncMeta {
  const active = status?.activeJob
  if (active) {
    return {
      active: true,
      message: active.message || 'Sincronizando…',
      noveltyText: null,
      lastSyncLabel: null,
      lastStatus: null,
    }
  }
  const last = status?.lastJob
  const novelty = formatSyncNovelty(last?.novelty ?? last?.result?.novelty)
  const when = link.effectiveLastSyncAt ?? link.lastSyncAt
  const failed = last?.status === 'failed'
  return {
    active: false,
    message: failed ? (last?.error || last?.message || 'Falha na última sincronização') : null,
    noveltyText: novelty,
    lastSyncLabel: formatLastSync(when),
    lastStatus: last?.status === 'failed' ? 'failed' : last?.status === 'success' ? 'success' : null,
  }
}

/**
 * Status do último sync por vínculo (espelho web `useWalletLinkSyncStatus`).
 * Não dispara sync — apenas polling de `/sync-status`.
 */
export function useIntegrationLinkSyncStatus(links: IntegrationLink[], refreshKey = 0, pausePolling = false) {
  const [byLinkId, setByLinkId] = useState<Record<string, LinkSyncMeta>>({})
  const { loading: authLoading, authUserId, configured: authConfigured } = useAuth()

  useEffect(() => {
    if (pausePolling) return
    if (authConfigured && (authLoading || !authUserId)) return
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
    const id = setInterval(poll, 30_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [links, refreshKey, pausePolling, authLoading, authUserId, authConfigured])

  return byLinkId
}
