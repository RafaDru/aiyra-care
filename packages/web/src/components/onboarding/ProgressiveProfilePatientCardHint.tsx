import { useEffect, useState } from 'react'
import { Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api.js'
import { ProgressiveProfileIntegrationsLink } from './ProgressiveProfileIntegrationsLink.js'

type Props = {
  patientId: string
  /** Titular já tem alerta global no Início — CTA compacto só no card de dependentes. */
  isSelf?: boolean
}

/** Anel B — CTA Integrações no card do paciente (grid Início) quando ainda não há links. */
export function ProgressiveProfilePatientCardHint({ patientId, isSelf }: Props) {
  const { t } = useTranslation()
  const [needsLink, setNeedsLink] = useState(false)

  useEffect(() => {
    if (isSelf) {
      setNeedsLink(false)
      return
    }
    let cancelled = false
    void api.integrationLinks
      .list(patientId)
      .then((links) => {
        if (!cancelled) setNeedsLink(links.length === 0)
      })
      .catch(() => {
        if (!cancelled) setNeedsLink(false)
      })
    return () => {
      cancelled = true
    }
  }, [patientId, isSelf])

  if (!needsLink) return null

  return (
    <div
      style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(0,0,0,0.06)' }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
        {t('progressiveProfile.patientCardHint')}
      </Typography.Text>
      <ProgressiveProfileIntegrationsLink
        patientId={patientId}
        surface="dashboard_patient_card"
        variant="link"
        testId="dashboard-patient-card-integrations-cta"
      >
        {t('progressiveProfile.integrationsCta')}
      </ProgressiveProfileIntegrationsLink>
    </div>
  )
}
