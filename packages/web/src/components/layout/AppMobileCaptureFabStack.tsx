import { PlusOutlined, FileTextOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext.js'
import { useAvaPatientLens } from '../ava/useAvaPatientLens.js'
import { requestQuickCaptureOpen } from '../../lib/quick-capture-bus.js'
import { requestConsultVisitOpen } from '../../lib/clinical-export-bus.js'

/** FAB + compact: stack Registro (roxo) e Pedido acima. */
export function AppMobileCaptureFabStack() {
  const { t } = useTranslation()
  const { configured, user } = useAuth()
  const { patientId, loading } = useAvaPatientLens()
  const [open, setOpen] = useState(false)

  if (!configured || !user || loading) return null

  return (
    <div
      className={`app-mobile-fab-stack${open ? ' app-mobile-fab-stack--open' : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false)
      }}
    >
      {open && (
        <div className="app-mobile-fab-stack__actions">
          <button
            type="button"
            className="app-mobile-fab-stack__action app-mobile-fab-stack__action--pedido"
            disabled={!patientId}
            onClick={() => {
              if (!patientId) return
              requestConsultVisitOpen({ patientId })
              setOpen(false)
            }}
          >
            <FileTextOutlined />
            <span>{t('headerOrderRequests.trigger')}</span>
          </button>
          <button
            type="button"
            className="app-mobile-fab-stack__action app-mobile-fab-stack__action--registro"
            onClick={() => {
              requestQuickCaptureOpen()
              setOpen(false)
            }}
          >
            <PlusOutlined />
            <span>{t('quickCapture.trigger')}</span>
          </button>
        </div>
      )}
      <button
        type="button"
        className="app-mobile-fab-stack__main"
        aria-expanded={open}
        aria-label={open ? t('common.close') : t('mobileFab.expand')}
        onClick={() => setOpen((v) => !v)}
      >
        <PlusOutlined className={open ? 'app-mobile-fab-stack__main-icon--open' : undefined} />
      </button>
    </div>
  )
}