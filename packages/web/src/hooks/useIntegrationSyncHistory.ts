import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api.js'
import type { IntegrationLink, SyncJobStatusPayload } from '../lib/api.types.js'
import { brandOrFallback } from '../components/brands/brand-config.js'
import { formatSyncNovelty } from '../lib/silent-sync.js'
import type { SyncablePortalType } from '../lib/sync-portal-profile.js'
import type { SyncStepDetail } from '../lib/sync-job-progress.js'
import { useAuth } from '../contexts/AuthContext.js'

export interface IntegrationSyncHistoryEntry {
  linkId: string
  jobId: string | null
  portalType: SyncablePortalType
  label: string
  status: 'pending' | 'running' | 'success' | 'failed'
  step: string | null
  startedAt: Date
  finishedAt: Date | null
  message: string | null
  noveltyText: string | null
  stepDetails: Record<string, SyncStepDetail>
  result: SyncJobStatusPayload['result']
  isActive: boolean
}

function mapJobToEntry(
  linkId: string,
  portalType: string,
  label: string,
  job: SyncJobStatusPayload | null,
  isActive: boolean,
): IntegrationSyncHistoryEntry {
  if (!job) {
    return {
      linkId,
      jobId: null,
      portalType: portalType as SyncablePortalType,
      label,
      status: 'pending',
      step: null,
      startedAt: new Date(0),
      finishedAt: null,
      message: null,
      noveltyText: null,
      stepDetails: {},
      result: null,
      isActive: false,
    }
  }

  const novelty = job.novelty ?? job.result?.novelty
  const stepDetails = Object.fromEntries(
    Object.entries(job.stepDetails ?? {}).map(([k, v]) => [
      k,
      { status: v.status as SyncStepDetail['status'], message: v.message },
    ]),
  )

  return {
    linkId,
    jobId: job.id,
    portalType: (job.portalType || portalType) as SyncablePortalType,
    label,
    status: job.status,
    step: job.step,
    startedAt: new Date(job.startedAt),
    finishedAt: job.finishedAt ? new Date(job.finishedAt) : null,
    message: job.error || job.message,
    noveltyText: formatSyncNovelty(novelty) || null,
    stepDetails,
    result: job.result,
    isActive,
  }
}

export function useIntegrationSyncHistory(syncTargets: IntegrationLink[], refreshKey = 0, pausePolling = false) {
  const [entries, setEntries] = useState<IntegrationSyncHistoryEntry[]>([])
  const { loading: authLoading, session, configured: authConfigured } = useAuth()

  useEffect(() => {
    if (pausePolling) return
    if (authConfigured && (authLoading || !session)) return
    if (!syncTargets.length) {
      setEntries([])
      return
    }

    let cancelled = false
    const poll = async () => {
      try {
        const rows = await Promise.all(
          syncTargets.map(async (link) => {
            const linkId = link.effectiveSyncLinkId ?? link.id
            const status = await api.integrationLinks.syncStatus(linkId)
            const meta = brandOrFallback(link.portalType)
            const job = status.activeJob ?? status.lastJob
            return mapJobToEntry(
              linkId,
              link.portalType,
              meta.label,
              job,
              status.activeJob != null,
            )
          }),
        )
        if (!cancelled) setEntries(rows)
      } catch {
        // mantém último estado
      }
    }

    void poll()
    const id = window.setInterval(poll, 20_000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [syncTargets, refreshKey, pausePolling, authLoading, session, authConfigured])

  const groupedByDate = useMemo(() => {
    const withTime = entries.filter((e) => e.finishedAt || e.isActive)
    const groups = new Map<string, IntegrationSyncHistoryEntry[]>()

    for (const entry of withTime) {
      const ref = entry.isActive && !entry.finishedAt ? new Date() : entry.finishedAt!
      const dateKey = ref.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
      const list = groups.get(dateKey) ?? []
      list.push(entry)
      groups.set(dateKey, list)
    }

    return [...groups.entries()]
      .map(([dateLabel, items]) => ({
        dateLabel,
        items: [...items].sort((a, b) => {
          const ta = (a.finishedAt ?? a.startedAt).getTime()
          const tb = (b.finishedAt ?? b.startedAt).getTime()
          return tb - ta
        }),
      }))
      .sort((a, b) => {
        const ta = a.items[0] ? (a.items[0].finishedAt ?? a.items[0].startedAt).getTime() : 0
        const tb = b.items[0] ? (b.items[0].finishedAt ?? b.items[0].startedAt).getTime() : 0
        return tb - ta
      })
  }, [entries])

  const activeEntries = useMemo(
    () => entries.filter((e) => e.isActive),
    [entries],
  )

  return { entries, groupedByDate, activeEntries }
}
