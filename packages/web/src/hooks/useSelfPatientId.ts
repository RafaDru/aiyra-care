import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'

/** Paciente titular (`isSelf`) da conta — usado em CTAs Anel B. */
export function useSelfPatientId(enabled = true): string | null {
  const [selfPatientId, setSelfPatientId] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    void api.patients
      .list()
      .then((list) => {
        if (cancelled) return
        setSelfPatientId(list.find((p) => p.isSelf)?.id ?? null)
      })
      .catch(() => {
        if (!cancelled) setSelfPatientId(null)
      })
    return () => {
      cancelled = true
    }
  }, [enabled])

  return selfPatientId
}
