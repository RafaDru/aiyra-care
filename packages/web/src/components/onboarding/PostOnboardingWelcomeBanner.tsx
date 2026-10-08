import { useEffect, useState } from 'react'
import { Button, Card, Space, Typography } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import {
  clearOnboardingJustCompleted,
  isOnboardingJustCompleted,
} from '../../lib/onboarding-wizard-storage.js'
import { notifyPostOnboardingWelcomeDismissed } from '../../lib/onboarding-welcome-bus.js'
import { requestFirstVisitTourOpen } from '../../lib/first-visit-tour-bus.js'
import { trackProductEvent } from '../../lib/product-events.js'

const welcomeCardStyle = {
  marginBottom: 16,
  borderColor: '#d1fae5',
  background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 55%)',
} as const

const { Paragraph, Title } = Typography

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
    requestFirstVisitTourOpen({ force: true })
  }

  return (
    <Card
      size="small"
      data-testid="post-onboarding-welcome"
      style={welcomeCardStyle}
      title={<Title level={5} style={{ margin: 0 }}>{t('onboarding.dashboardWelcomeTitle')}</Title>}
      extra={
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          aria-label={t('common.close')}
          onClick={dismissOnly}
        />
      }
    >
      <Paragraph type="secondary" style={{ marginBottom: 12, fontSize: 13 }}>
        {t('onboarding.dashboardWelcomeBody')}
      </Paragraph>
      <Space wrap>
        <Button size="small" type="primary" onClick={dismissOnly}>
          {t('onboarding.dashboardWelcomeCta')}
        </Button>
        <Button size="small" type="default" onClick={openFirstStepsGuide}>
          {t('onboarding.dashboardWelcomeTourCta')}
        </Button>
      </Space>
    </Card>
  )
}
