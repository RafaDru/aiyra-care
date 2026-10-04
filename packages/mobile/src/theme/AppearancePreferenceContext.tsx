import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type AppearancePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'aiyracare.mobile.appearance'

type Ctx = {
  preference: AppearancePreference
  setPreference: (next: AppearancePreference) => void
  ready: boolean
}

const AppearanceContext = createContext<Ctx | null>(null)

export function AppearancePreferenceProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<AppearancePreference>('light')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw === 'light' || raw === 'dark' || raw === 'system') {
          setPreferenceState(raw)
        }
      })
      .finally(() => setReady(true))
  }, [])

  const setPreference = useCallback((next: AppearancePreference) => {
    setPreferenceState(next)
    void AsyncStorage.setItem(STORAGE_KEY, next)
  }, [])

  const value = useMemo(() => ({ preference, setPreference, ready }), [preference, setPreference, ready])

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
}

export function useAppearancePreference() {
  const ctx = useContext(AppearanceContext)
  if (!ctx) throw new Error('useAppearancePreference outside provider')
  return ctx
}
