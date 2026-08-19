import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

interface LlmActivityContextValue {
  /** Qualquer operação LLM em andamento (chat Ava, interpretação, etc.). */
  active: boolean
  beginLlmActivity: () => void
  endLlmActivity: () => void
  runLlmTask: <T>(fn: () => Promise<T>) => Promise<T>
}

const LlmActivityContext = createContext<LlmActivityContextValue | null>(null)

export function LlmActivityProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0)
  const countRef = useRef(0)

  const beginLlmActivity = useCallback(() => {
    countRef.current += 1
    setCount(countRef.current)
  }, [])

  const endLlmActivity = useCallback(() => {
    countRef.current = Math.max(0, countRef.current - 1)
    setCount(countRef.current)
  }, [])

  const runLlmTask = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    beginLlmActivity()
    try {
      return await fn()
    } finally {
      endLlmActivity()
    }
  }, [beginLlmActivity, endLlmActivity])

  const value = useMemo(
    () => ({
      active: count > 0,
      beginLlmActivity,
      endLlmActivity,
      runLlmTask,
    }),
    [count, beginLlmActivity, endLlmActivity, runLlmTask],
  )

  return (
    <LlmActivityContext.Provider value={value}>
      {children}
    </LlmActivityContext.Provider>
  )
}

export function useLlmActivity(): LlmActivityContextValue {
  const ctx = useContext(LlmActivityContext)
  if (!ctx) {
    throw new Error('useLlmActivity must be used within LlmActivityProvider')
  }
  return ctx
}
