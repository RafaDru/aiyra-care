import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type CompactPatientChromeState = {
  /** 0 = header cheio; 1 = chrome compacto (coração + pessoa). */
  progress: number
  /** 0→1 compactação macro — só após sticky rail colidir com header. */
  macroProgress: number
  patientFocus: boolean
}

type CompactPatientChromeContextValue = CompactPatientChromeState & {
  setChrome: (patch: Partial<CompactPatientChromeState>) => void
  resetChrome: () => void
}

const defaultState: CompactPatientChromeState = {
  progress: 0,
  macroProgress: 0,
  patientFocus: false,
}

const CompactPatientChromeContext = createContext<CompactPatientChromeContextValue | null>(null)

export function CompactPatientChromeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CompactPatientChromeState>(defaultState)

  const setChrome = useCallback((patch: Partial<CompactPatientChromeState>) => {
    setState((prev) => ({ ...prev, ...patch }))
  }, [])

  const resetChrome = useCallback(() => setState(defaultState), [])

  const value = useMemo(
    () => ({ ...state, setChrome, resetChrome }),
    [state, setChrome, resetChrome],
  )

  return (
    <CompactPatientChromeContext.Provider value={value}>{children}</CompactPatientChromeContext.Provider>
  )
}

export function useCompactPatientChrome() {
  const ctx = useContext(CompactPatientChromeContext)
  if (!ctx) {
    return {
      ...defaultState,
      setChrome: () => {},
      resetChrome: () => {},
    }
  }
  return ctx
}