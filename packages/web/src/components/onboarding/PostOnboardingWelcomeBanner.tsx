import { useEffect, useState } from 'react'
import { Alert, Button } from 'antd'
import { useTranslation } from 'react-i18next'
import { consumeOnboardingJustCompleted } from '../../lib/onboarding-wizard-storage.js'
import { trackProductEvent } from '../../lib/product-events.js'

/** Light one-time welcome after onboarding — not the FirstVisitTour drawer epic. */
export function PostOnboardingWelcomeBanner() {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!consumeOnboardingJustCompleted()) return
    setVisible(true)
    trackProductEvent('onboarding_step', { step: 'dashboard_welcome_viewed' })
  }, [])

  if (!visible) return null

  const dismiss = () => {
    setVisible(false)
    trackProductEvent('onboarding_step', { step: 'dashboard_welcome_dismissed' })
  }

  return (
    <Alert
      type="info"
      showIcon
      closable
      onClose={dismiss}
      data-testid="post-onboarding-welcome"
      message={t('onboarding.dashboardWelcomeTitle')}
      description={t('onboarding.dashboardWelcomeBody')}
      action={
        <Button size="small" type="primary" onClick={dismiss}>
          {t('onboarding.dashboardWelcomeCta')}
        </Button>
      }
      style={{ marginBottom: 16 }}
    />
  )
}
