import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import type { PatientContext } from '../../lib/api.types.js'
import { subscribeConsultVisitOpen } from '../../lib/clinical-export-bus.js'
import { ConsultVisitWizardModal } from './ConsultVisitWizardModal.js'

/** Modal «Levar na consulta» — global (dashboard, perfil, Carteira). */
export function PatientConsultVisitHost() {
  const [open, setOpen] = useState(false)
  const [patientId, setPatientId] = useState<string | null>(null)
  const [context, setContext] = useState<PatientContext | null>(null)

  const openWizard = useCallback((id: string) => {
    setPatientId(id)
    setOpen(true)
    api.patients
      .context(id)
      .then(setContext)
      .catch(() => setContext(null))
  }, [])

  useEffect(() => {
    return subscribeConsultVisitOpen((req) => {
      if (req.patientId) openWizard(req.patientId)
    })
  }, [openWizard])

  if (!patientId) return null

  return (
    <ConsultVisitWizardModal
      open={open}
      patientId={patientId}
      patientName={context?.identity.name}
      context={context}
      onClose={() => {
        setOpen(false)
        setContext(null)
      }}
    />
  )
}
