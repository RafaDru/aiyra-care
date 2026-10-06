import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChLiveConnectionState } from '../components/ChLiveIndicator.js'
import type { PlatformDefectItem } from '../ops.types.js'
import { defectMatchesStatusFilter, type DefectBoardStatusFilter } from '../ch-defect-board-filter.js'
import { opsApi } from '../api.js'

type DefectBoardEvent = {
  defectId: string
  status: PlatformDefectItem['status']
  suggestedStatusFilter: DefectBoardStatusFilter
  referenceCode?: string | null
  updatedAt?: string
  latestReview?: PlatformDefectItem['latestReview']
}

export function useDefectBoardStream(options: {
  deploymentTier: string
  statusFilter: DefectBoardStatusFilter
  onPatch: (updater: (prev: PlatformDefectItem[]) => PlatformDefectItem[]) => void
  onReload: () => Promise<void>
}) {
  const [connection, setConnection] = useState<ChLiveConnectionState>('reconnecting')
  const reconnectAttempt = useRef(0)
  const optionsRef = useRef(options)
  optionsRef.current = options

  const applyEvent = useCallback(async (event: DefectBoardEvent) => {
    const { statusFilter, onPatch, onReload } = optionsRef.current
    try {
      const detail = await opsApi.platformDefectDetail(event.defectId)
      const item = detail.defect
      const matches = defectMatchesStatusFilter(item.status, statusFilter)
      if (!matches && statusFilter !== 'all') {
        onPatch((prev) => prev.filter((x) => x.id !== event.defectId))
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
      setConnection('reconnecting')
      const tier = encodeURIComponent(optionsRef.current.deploymentTier)
      es = new EventSource(`/api/platform-defects/stream?deploymentTier=${tier}`)
      es.addEventListener('open', () => {
        reconnectAttempt.current = 0
        setConnection('live')
      })
      es.addEventListener('defect_updated', (ev) => {
        try {
          const data = JSON.parse(ev.data) as DefectBoardEvent
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
