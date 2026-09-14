import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import type { PatientContext } from '../../lib/api.types.js'
import { subscribeConsultVisitOpen } from '../../lib/clinical-export-bus.js'
import { ConsultVisitWizardModal } from './ConsultVisitWizardModal.js'

interface Props {
  patientId: string
  patientName?: string
}

/** Modal «Levar na consulta» — uma instância por perfil, ativo em qualquer aba. */
export function PatientConsultVisitHost({ patientId, patientName }: Props) {
  const [open, setOpen] = useState(false)
  const [context, setContext] = useState<PatientContext | null>(null)

  const openWizard = useCallback(() => {
    setOpen(true)
    api.patients
      .context(patientId)
      .then(setContext)
      .catch(() => setContext(null))
  }, [patientId])

  useEffect(() => {
    return subscribeConsultVisitOpen((req) => {
      if (req.patientId === patientId) openWizard()
    })
  }, [patientId, openWizard])

  return (
    <ConsultVisitWizardModal
      open={open}
      patientId={patientId}
      patientName={patientName ?? context?.identity.name}
      context={context}
      onClose={() => setOpen(false)}
    />
  )
}
