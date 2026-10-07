import { useEffect, useState } from 'react'
import { Alert, Button, Space } from 'antd'
import { useTranslation } from 'react-i18next'
import {
  clearOnboardingJustCompleted,
  isOnboardingJustCompleted,
} from '../../lib/onboarding-wizard-storage.js'
import { notifyPostOnboardingWelcomeDismissed } from '../../lib/onboarding-welcome-bus.js'
import { requestFirstVisitTourOpen } from '../../lib/first-visit-tour-bus.js'
import { trackProductEvent } from '../../lib/product-events.js'

/** Light one-time welcome after onboarding — defers FirstVisitTour until dismiss. */
export function PostOnboardingWelcomeBanner() {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!isOnboardingJustCompleted()) return
    setVisible(true)
    trackProductEvent('onboarding_step', { step: 'dashboard_welcome_viewed' })
  }, [])

  if (!visible) return null

  const finishWelcome = (telemetryStep: 'dashboard_welcome_dismissed' | 'dashboard_welcome_tour_cta') => {
    setVisible(false)
    clearOnboardingJustCompleted()
    notifyPostOnboardingWelcomeDismissed()
    trackProductEvent('onboarding_step', { step: telemetryStep })
  }

  const dismissOnly = () => finishWelcome('dashboard_welcome_dismissed')

  const openFirstStepsGuide = () => {
    finishWelcome('dashboard_welcome_tour_cta')
    requestFirstVisitTourOpen()
  }

  return (
    <Alert
      type="info"
      showIcon
      closable
      onClose={dismissOnly}
      data-testid="post-onboarding-welcome"
      message={t('onboarding.dashboardWelcomeTitle')}
      description={t('onboarding.dashboardWelcomeBody')}
      action={
        <Space wrap>
          <Button size="small" type="primary" onClick={dismissOnly}>
            {t('onboarding.dashboardWelcomeCta')}
          </Button>
          <Button size="small" type="default" onClick={openFirstStepsGuide}>
            {t('onboarding.dashboardWelcomeTourCta')}
          </Button>
        </Space>
      }
      style={{ marginBottom: 16 }}
    />
  )
}
