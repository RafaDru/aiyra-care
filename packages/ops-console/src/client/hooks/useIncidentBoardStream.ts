import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChLiveConnectionState } from '../components/ChLiveIndicator.js'
import type { OpsAnalysisQueueItem } from '../ops.types.js'
import {
  incidentMatchesBoardFilter,
  type IncidentBoardFilter,
} from '../ch-incident-board-filter.js'
import { opsApi } from '../api.js'

type IncidentBoardEvent = {
  incidentId: string
  suggestedFilter: IncidentBoardFilter
  referenceCode?: string | null
  title?: string
  incidentPipelineStatus?: OpsAnalysisQueueItem['incidentPipelineStatus']
  legacyStatus?: OpsAnalysisQueueItem['status']
  updatedAt?: string
  linkedDefects?: OpsAnalysisQueueItem['linkedDefects']
}

export function useIncidentBoardStream(options: {
  deploymentTier: string
  boardFilter: IncidentBoardFilter
  onPatch: (updater: (prev: OpsAnalysisQueueItem[]) => OpsAnalysisQueueItem[]) => void
  onReload: () => Promise<void>
}) {
  const [connection, setConnection] = useState<ChLiveConnectionState>('reconnecting')
  const reconnectAttempt = useRef(0)
  const optionsRef = useRef(options)
  optionsRef.current = options

  const applyEvent = useCallback(async (event: IncidentBoardEvent) => {
    const { boardFilter, onPatch, onReload } = optionsRef.current
    try {
      const { item } = await opsApi.analysisQueueItem(event.incidentId)
      const matchesCurrent = incidentMatchesBoardFilter(
        {
          status: item.status,
          incidentPipelineStatus: item.incidentPipelineStatus ?? 'open',
        },
        boardFilter,
      )
      if (event.suggestedFilter !== boardFilter && !matchesCurrent) {
        onPatch((prev) => prev.filter((x) => x.id !== event.incidentId))
        return
      }
      onPatch((prev) => {
        const idx = prev.findIndex((x) => x.id === item.id)
        if (idx === -1) return [item, ...prev]
        const next = [...prev]
        next[idx] = { ...next[idx], ...item }
        return next
      })
    } catch {
      await onReload()
    }
  }, [])

  useEffect(() => {
    let es: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined
    let closed = false

    const connect = () => {
      if (closed) return
      setConnection(reconnectAttempt.current === 0 ? 'reconnecting' : 'reconnecting')
      const tier = encodeURIComponent(optionsRef.current.deploymentTier)
      es = new EventSource(`/api/analysis-queue/stream?deploymentTier=${tier}`)
      es.addEventListener('open', () => {
        reconnectAttempt.current = 0
        setConnection('live')
      })
      es.addEventListener('incident_updated', (ev) => {
        try {
          const data = JSON.parse(ev.data) as IncidentBoardEvent
          void applyEvent(data)
        } catch {
          // ignore malformed events
        }
      })
      es.onerror = () => {
        setConnection('offline')
        es?.close()
        es = null
        reconnectAttempt.current += 1
        const delay = Math.min(30_000, 1000 * 2 ** Math.min(reconnectAttempt.current, 5))
        reconnectTimer = setTimeout(() => {
          if (reconnectAttempt.current >= 3) {
            void optionsRef.current.onReload()
          }
          connect()
        }, delay)
      }
    }

    connect()

    return () => {
      closed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      es?.close()
    }
  }, [applyEvent, options.deploymentTier])

  return { connection }
}
