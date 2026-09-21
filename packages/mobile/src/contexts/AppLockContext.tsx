import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import {
  authenticateWithBiometric,
  getBiometricSupport,
  isBiometricUnlockEnabled,
  setBiometricUnlockEnabled,
  type BiometricSupport,
} from '@/lib/biometric-unlock'

type AppLockContextValue = {
  ready: boolean
  biometricSupport: BiometricSupport
  biometricUnlockEnabled: boolean
  isUnlocked: boolean
  setBiometricUnlockEnabled: (enabled: boolean, promptMessage?: string) => Promise<boolean>
  tryBiometricUnlock: (promptMessage: string) => Promise<boolean>
  lock: () => void
  unlock: () => void
}

const AppLockContext = createContext<AppLockContextValue | null>(null)

export function AppLockProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [biometricSupport, setBiometricSupport] = useState<BiometricSupport>({
    available: false,
    enrolled: false,
    label: 'Biometria',
  })
  const [biometricUnlockEnabled, setBiometricUnlockEnabledState] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)

  useEffect(() => {
    void (async () => {
      const [support, enabled] = await Promise.all([getBiometricSupport(), isBiometricUnlockEnabled()])
      setBiometricSupport(support)
      setBiometricUnlockEnabledState(enabled)
      setIsUnlocked(!enabled)
      setReady(true)
    })()
  }, [])

  useEffect(() => {
    if (!biometricUnlockEnabled) return
    const onChange = (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        setIsUnlocked(false)
      }
    }
    const sub = AppState.addEventListener('change', onChange)
    return () => sub.remove()
  }, [biometricUnlockEnabled])

  const lock = useCallback(() => setIsUnlocked(false), [])
  const unlock = useCallback(() => setIsUnlocked(true), [])

  const tryBiometricUnlock = useCallback(
    async (promptMessage: string) => {
      const ok = await authenticateWithBiometric(promptMessage)
      if (ok) setIsUnlocked(true)
      return ok
    },
    [],
  )

  const setBiometricUnlock = useCallback(async (enabled: boolean, promptMessage?: string) => {
    if (enabled) {
      const support = await getBiometricSupport()
      if (!support.available) return false
      const ok = await authenticateWithBiometric(promptMessage ?? 'Confirmar biometria')
      if (!ok) return false
      await setBiometricUnlockEnabled(true)
      setBiometricUnlockEnabledState(true)
      setIsUnlocked(true)
      return true
    }
    await setBiometricUnlockEnabled(false)
    setBiometricUnlockEnabledState(false)
    setIsUnlocked(true)
    return true
  }, [])

  const value = useMemo(
    () => ({
      ready,
      biometricSupport,
      biometricUnlockEnabled,
      isUnlocked,
      setBiometricUnlockEnabled: setBiometricUnlock,
      tryBiometricUnlock,
      lock,
      unlock,
    }),
    [
      ready,
      biometricSupport,
      biometricUnlockEnabled,
      isUnlocked,
      setBiometricUnlock,
      tryBiometricUnlock,
      lock,
      unlock,
    ],
  )

  return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>
}

export function useAppLock() {
  const ctx = useContext(AppLockContext)
  if (!ctx) throw new Error('useAppLock outside AppLockProvider')
  return ctx
}

/** Sessão Supabase existe mas o usuário ainda não passou pela biometria nesta abertura. */
export function useRequiresBiometricUnlock(sessionPresent: boolean): boolean {
  const { ready, biometricUnlockEnabled, isUnlocked } = useAppLock()
  if (!ready || !sessionPresent) return false
  return biometricUnlockEnabled && !isUnlocked
}
