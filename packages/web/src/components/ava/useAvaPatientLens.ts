import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { api } from '../../lib/api.js'
import type { Patient } from '../../lib/api.types.js'
import {
  resolveAvaPatientLens,
  writeAvaLastPatientId,
} from '../../lib/ava-patient-lens.js'

function routePatientIdFromLocation(
  params: Record<string, string | undefined>,
  search: string,
): string | null {
  const fromParams = params.id
  if (fromParams) return fromParams
  const q = new URLSearchParams(search).get('patientId')
  return q ?? null
}

/**
 * Lente de paciente da Ava global: rota → último usado → self → primeiro.
 * Override manual persiste em localStorage e sobrescreve até mudar de rota.
 */
export function useAvaPatientLens() {
  const location = useLocation()
  const params = useParams()
  const routePatientId = routePatientIdFromLocation(
    params as Record<string, string | undefined>,
    location.search,
  )

  const [patients, setPatients] = useState<Patient[]>([])
  const [overrideId, setOverrideId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
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
    return resolveAvaPatientLens(patients, routePatientId)
  }, [patients, overrideId, routePatientId])

  const setPatientId = useCallback(
    (id: string) => {
      if (!patients.some((p) => p.id === id)) return
      setOverrideId(id)
      writeAvaLastPatientId(id)
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
