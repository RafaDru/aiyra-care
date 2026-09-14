import { useEffect, useState } from 'react'
import { Button } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext.js'
import { useAvaPatientLens } from '../ava/useAvaPatientLens.js'
import {
  subscribeQuickCaptureOpen,
  type QuickCaptureKind,
} from '../../lib/quick-capture-bus.js'
import { QuickCaptureSheet } from './QuickCaptureSheet.js'

/** Botão global + sheet de captura rápida (D2). */
export function QuickCaptureGlobal() {
  const { t } = useTranslation()
  const { configured, user } = useAuth()
  const {
    patients,
    patientId,
    routePatientId,
    loading,
    setPatientId,
  } = useAvaPatientLens()

  const [open, setOpen] = useState(false)
  const [initialKind, setInitialKind] = useState<QuickCaptureKind | undefined>()

  useEffect(() => {
    return subscribeQuickCaptureOpen((req) => {
      if (req.patientId) setPatientId(req.patientId)
      setInitialKind(req.kind)
      setOpen(true)
    })
  }, [setPatientId])

  if (!configured || !user || loading) return null

  return (
    <>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => {
          setInitialKind(undefined)
          setOpen(true)
        }}
      >
        {t('quickCapture.trigger')}
      </Button>
      <QuickCaptureSheet
        open={open}
        onClose={() => setOpen(false)}
        patients={patients}
        patientId={patientId}
        routePatientId={routePatientId}
        onPatientChange={setPatientId}
        initialKind={initialKind}
      />
    </>
  )
}
