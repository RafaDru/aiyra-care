import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import type { ClinicalLinkCount } from '../lib/api.types.js'

export function useClinicalLinkCounts(patientId: string) {
  const [counts, setCounts] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(false)

  const reload = useCallback(() => {
    if (!patientId) return
    setLoading(true)
    api.clinicalLinks
      .counts(patientId)
      .then((rows: ClinicalLinkCount[]) => {
        const map = new Map<string, number>()
        for (const row of rows) {
          map.set(`${row.entityType}:${row.entityId}`, row.count)
        }
        setCounts(map)
      })
      .catch(() => setCounts(new Map()))
      .finally(() => setLoading(false))
  }, [patientId])

  useEffect(() => {
    reload()
  }, [reload])

  const getCount = (entityType: string, entityId: string) =>
    counts.get(`${entityType}:${entityId}`) ?? 0

  return { counts, loading, reload, getCount }
}
