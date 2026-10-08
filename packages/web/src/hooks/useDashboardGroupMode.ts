import { useCallback, useEffect, useState } from 'react'
import type { DashboardGroupMode } from '../lib/dashboard/group-patients-for-dashboard.js'

const STORAGE_KEY = 'aiyracare.dashboard_group_mode'

function readStoredMode(): DashboardGroupMode | null {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'family' || stored === 'age' || stored === 'alpha') return stored
  return null
}

function defaultModeForCircleCount(circleCount: number): DashboardGroupMode {
  return circleCount >= 2 ? 'family' : 'age'
}

export function useDashboardGroupMode(circleCount: number) {
  const [mode, setModeState] = useState<DashboardGroupMode>(() => {
    return readStoredMode() ?? defaultModeForCircleCount(circleCount)
  })

  useEffect(() => {
    if (readStoredMode() !== null) return
    setModeState(defaultModeForCircleCount(circleCount))
  }, [circleCount])

  const setMode = useCallback((next: DashboardGroupMode) => {
    setModeState(next)
    localStorage.setItem(STORAGE_KEY, next)
  }, [])

  return { mode, setMode }
}
