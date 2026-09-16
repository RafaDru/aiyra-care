import { useEffect, useRef } from 'react'
import { App } from 'antd'
import { api } from '../lib/api.js'
import type { IntegrationLink } from '../lib/api.types.js'
import { shouldOfferSilentSync } from '../lib/silent-sync.js'
import { collectSyncTargets } from '../lib/silent-sync.js'
import { trackSyncJobSkipped, trackSyncJobStarted } from '../lib/telemetry/sync-telemetry.js'
import { useAuth } from '../contexts/AuthContext.js'

/** Evita re-disparar silent sync ao trocar abas no mesmo paciente. */
const silentStartedForLink = new Set<string>()

const SILENT_FAIL_RE =
  /login|autentic|chrome|cdp|sess[aã]o|credenciais|portal do cliente|abra o|inv[aá]lid/i

/**
 * P0 Connect — sync silencioso ao abrir Carteira (sessão válida + dados stale).
 * Serializa portais; modal só no Sincronizar manual (Integrações).
 */
export function useSilentWalletSync(links: IntegrationLink[], onUpdated?: () => void) {
  const { message } = App.useApp()
  const { loading: authLoading, authUserId, configured: authConfigured } = useAuth()
  const runningRef = useRef(false)

  useEffect(() => {
    if (authConfigured && (authLoading || !authUserId)) return

    const targets = collectSyncTargets(links).filter((link) => {
      const syncLinkId = link.effectiveSyncLinkId ?? link.id
      if (silentStartedForLink.has(syncLinkId)) return false
      return shouldOfferSilentSync(link)
    })
    if (!targets.length || runningRef.current) return

    let cancelled = false
    runningRef.current = true

    const run = async () => {
      for (const link of targets) {
        if (cancelled) break
        const syncLinkId = link.effectiveSyncLinkId ?? link.id
        silentStartedForLink.add(syncLinkId)
        try {
          const r = await api.integrationLinks.sync(syncLinkId, { silent: true })
          if (r.skipped) {
            trackSyncJobSkipped(link.portalType, r.reason ?? 'skipped', 'silent')
            continue
          }
          if (r.jobId) trackSyncJobStarted(link.portalType, 'silent')
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          if (SILENT_FAIL_RE.test(msg)) {
            message.warning(
              'Atualização silenciosa falhou — use Sincronizar em Integrações se precisar reconectar',
            )
          }
          console.warn('Silent wallet sync failed', e)
        }
      }
      if (!cancelled) onUpdated?.()
      runningRef.current = false
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [links, authLoading, authUserId, authConfigured, message, onUpdated])
}
