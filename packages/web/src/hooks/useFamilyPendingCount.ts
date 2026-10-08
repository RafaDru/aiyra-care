import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'

/** Pending family invites + incoming profile shares (same logic as legacy dashboard shortcut). */
export function useFamilyPendingCount(enabled = true) {
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (!enabled) {
      setPendingCount(0)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const [invites, incomingShares] = await Promise.all([
          api.familyAccess.listInvites(),
          api.familyAccess.listProfileSharesIncoming(),
        ])
        if (cancelled) return
        const pendingInvites = invites.filter((i) => i.status === 'pending').length
        const pendingShares = incomingShares.filter((s) => s.status === 'pending').length
        setPendingCount(pendingInvites + pendingShares)
      } catch {
        if (!cancelled) setPendingCount(0)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [enabled])

  return pendingCount
}
