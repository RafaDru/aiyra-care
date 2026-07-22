import { useEffect, useState, useCallback } from 'react'

export function usePatientEntity<T>(
  fetcher: (patientId: string) => Promise<T[]>,
  patientId: string | undefined,
) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(() => {
    if (!patientId) return
    setLoading(true)
    fetcher(patientId).then(setData).finally(() => setLoading(false))
  }, [patientId])

  useEffect(() => { load() }, [load])

  return { data, loading, reload: load }
}
