import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api } from '../lib/api.js'
import {
  readStoredActiveCareCircleId,
  writeStoredActiveCareCircleId,
} from '../lib/active-care-circle-storage.js'
import { useAuth } from './AuthContext.js'

export interface CareCircleOption {
  id: string
  name: string
  memberRole?: string
}

interface ActiveCareCircleContextValue {
  circles: CareCircleOption[]
  loading: boolean
  activeCircleId: string | undefined
  setActiveCircleId: (id: string) => void
  hasMultipleCircles: boolean
  refreshCircles: () => Promise<void>
}

const ActiveCareCircleContext = createContext<ActiveCareCircleContextValue | null>(null)

function pickActiveId(rows: CareCircleOption[], stored: string | null): string | undefined {
  if (rows.length === 0) return undefined
  if (stored && rows.some((c) => c.id === stored)) return stored
  return rows[0]?.id
}

export function ActiveCareCircleProvider({ children }: { children: ReactNode }) {
  const { configured, user } = useAuth()
  const [circles, setCircles] = useState<CareCircleOption[]>([])
  const [loading, setLoading] = useState(false)
  const [activeCircleId, setActiveCircleIdState] = useState<string | undefined>()

  const refreshCircles = useCallback(async () => {
    if (!configured || !user) {
      setCircles([])
      setActiveCircleIdState(undefined)
      return
    }
    setLoading(true)
    try {
      const rows = await api.careCircles.list()
      setCircles(rows)
      const next = pickActiveId(rows, readStoredActiveCareCircleId())
      setActiveCircleIdState(next)
      if (next) writeStoredActiveCareCircleId(next)
    } catch {
      setCircles([])
      setActiveCircleIdState(undefined)
    } finally {
      setLoading(false)
    }
  }, [configured, user])

  useEffect(() => {
    void refreshCircles()
  }, [refreshCircles])

  const setActiveCircleId = useCallback((id: string) => {
    setActiveCircleIdState(id)
    writeStoredActiveCareCircleId(id)
  }, [])

  const hasMultipleCircles = circles.length >= 2

  const value = useMemo(
    () => ({
      circles,
      loading,
      activeCircleId,
      setActiveCircleId,
      hasMultipleCircles,
      refreshCircles,
    }),
    [circles, loading, activeCircleId, setActiveCircleId, hasMultipleCircles, refreshCircles],
  )

  return <ActiveCareCircleContext.Provider value={value}>{children}</ActiveCareCircleContext.Provider>
}

export function useActiveCareCircle(): ActiveCareCircleContextValue {
  const ctx = useContext(ActiveCareCircleContext)
  if (!ctx) {
    throw new Error('useActiveCareCircle must be used within ActiveCareCircleProvider')
  }
  return ctx
}
