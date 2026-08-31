import { useEffect, useState } from 'react'
import {
  getAccountFreshnessState,
  hasNewDomain,
  subscribeAccountFreshness,
} from '../lib/account-freshness.js'

/** Badge “dados novos” quando generation do servidor ≠ última vista na aba. */
export function usePatientDomainFresh(patientId: string | undefined, domain: string): boolean {
  const [fresh, setFresh] = useState(false)

  useEffect(() => {
    if (!patientId) {
      setFresh(false)
      return
    }
    const sync = () => setFresh(hasNewDomain(patientId, domain))
    sync()
    return subscribeAccountFreshness(sync)
  }, [patientId, domain])

  return fresh
}

/** Re-render quando o manifest L1 muda (ex.: após sync). */
export function useAccountFreshnessSnapshot(): ReturnType<typeof getAccountFreshnessState> {
  const [snapshot, setSnapshot] = useState(getAccountFreshnessState())

  useEffect(() => {
    const sync = () => setSnapshot(getAccountFreshnessState())
    return subscribeAccountFreshness(sync)
  }, [])

  return snapshot
}
