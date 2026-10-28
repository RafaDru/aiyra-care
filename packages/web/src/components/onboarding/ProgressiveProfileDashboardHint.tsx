import { useEffect, useState } from 'react'
import { Alert, Space } from 'antd'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api.js'
import { useSelfPatientId } from '../../hooks/useSelfPatientId.js'
import { ProgressiveProfileIntegrationsLink } from './ProgressiveProfileIntegrationsLink.js'

const DISMISS_KEY = 'aiyracare.progressive_profile_dashboard_hint_dismissed'

/** Anel B — lembrete no Início quando o titular ainda não tem integrações. */
export function ProgressiveProfileDashboardHint({ hasPatients }: { hasPatients: boolean }) {
  const { t } = useTranslation()
  const selfPatientId = useSelfPatientId(hasPatients)
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })
  const [needsLink, setNeedsLink] = useState(false)

  useEffect(() => {
    if (!hasPatients || !selfPatientId || dismissed) {
      setNeedsLink(false)
      return
    }
    let cancelled = false
    void api.integrationLinks
      .list(selfPatientId)
      .then((links) => {
        if (!cancelled) setNeedsLink(links.length === 0)
      })
      .catch(() => {
        if (!cancelled) setNeedsLink(false)
      })
    return () => {
      cancelled = true
    }
  }, [hasPatients, selfPatientId, dismissed])

  if (!needsLink || !selfPatientId) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  return (
    <Alert
      type="info"
      showIcon
      closable
      onClose={dismiss}
      data-testid="dashboard-progressive-profile-hint"
      style={{ marginBottom: 16 }}
      message={t('progressiveProfile.dashboardHintTitle')}
      description={
        <Space direction="vertical" size={8}>
          <span>{t('progressiveProfile.dashboardHintBody')}</span>
          <ProgressiveProfileIntegrationsLink
            patientId={selfPatientId}
            surface="dashboard_hint"
            variant="button"
            buttonType="primary"
            testId="dashboard-progressive-profile-cta"
          >
            {t('progressiveProfile.integrationsCta')}
          </ProgressiveProfileIntegrationsLink>
        </Space>
      }
    />
  )
}
