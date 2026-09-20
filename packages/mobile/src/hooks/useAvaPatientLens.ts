import { useGlobalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import type { Patient } from '@/lib/api.types'
import {
  readAvaLastPatientId,
  resolveAvaPatientLens,
  writeAvaLastPatientId,
} from '@/lib/ava-patient-lens'

/**
 * Lente de paciente da Ava global: rota do perfil → último usado → self → primeiro.
 */
export function useAvaPatientLens() {
  const params = useGlobalSearchParams<{ id?: string }>()
  const routePatientId = typeof params.id === 'string' && params.id.length > 0 ? params.id : null

  const [patients, setPatients] = useState<Patient[]>([])
  const [overrideId, setOverrideId] = useState<string | null>(null)
  const [lastStoredId, setLastStoredId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void readAvaLastPatientId().then((id) => {
      if (!cancelled) setLastStoredId(id)
    })
    api.patients
      .list()
      .then((list) => {
        if (!cancelled) setPatients(list)
      })
      .catch(() => {
        if (!cancelled) setPatients([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setOverrideId(null)
  }, [routePatientId])

  const patientId = useMemo(() => {
    if (patients.length === 0) return null
    if (overrideId && patients.some((p) => p.id === overrideId)) return overrideId
    return resolveAvaPatientLens(patients, routePatientId, lastStoredId)
  }, [patients, overrideId, routePatientId, lastStoredId])

  const setPatientId = useCallback(
    (id: string) => {
      if (!patients.some((p) => p.id === id)) return
      setOverrideId(id)
      void writeAvaLastPatientId(id).then(() => setLastStoredId(id))
    },
    [patients],
  )

  const activePatient = patients.find((p) => p.id === patientId) ?? null

  return {
    patients,
    patientId,
    activePatient,
    routePatientId,
    loading,
    setPatientId,
    lensOverridesRoute: Boolean(
      routePatientId && patientId && patientId !== routePatientId,
    ),
  }
}
