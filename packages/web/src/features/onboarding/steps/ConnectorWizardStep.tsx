import { useEffect, useState } from 'react'
import { Button, Card, Col, Row, Space, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { BrandLogo } from '../../../components/brands/BrandLogo.js'
import { PublicHealthIntegrationModal } from '../../../components/integrations/PublicHealthIntegrationModal.js'
import { ImportInsuranceModal } from '../../../components/scraper/ImportInsuranceModal.js'
import { trackProductEvent } from '../../../lib/product-events.js'
import { ONBOARDING_CONNECTOR_STEPS, type OnboardingConnectorKind } from '../onboarding-catalog.js'

const { Title, Text } = Typography

type ConnectorWizardStepProps = {
  kind: OnboardingConnectorKind
  connectorIndex: number
  selfPatientId: string
  onSkip: () => void
  onContinue: () => void
  isLast: boolean
}

export function ConnectorWizardStep({
  kind,
  connectorIndex,
  selfPatientId,
  onSkip,
  onContinue,
  isLast,
}: ConnectorWizardStepProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const stepDef = ONBOARDING_CONNECTOR_STEPS[connectorIndex]!
  const [susOpen, setSusOpen] = useState(false)
  const [insuranceOpen, setInsuranceOpen] = useState<{ portal: 'unimed' | 'amil' | 'bradesco_saude'; label: string } | null>(null)

  useEffect(() => {
    trackProductEvent('onboarding_step', { step: stepDef.stepId, skipped: false })
  }, [stepDef.stepId])

  const skip = () => {
    trackProductEvent('onboarding_step', { step: stepDef.stepId, skipped: true })
    onSkip()
  }

  const profileIntegrationsHref = `/patients/${selfPatientId}?tab=integrations`

  const openOption = (optionId: string) => {
    const option = stepDef.options.find((o) => o.id === optionId)
    if (!option) return
    if (option.action === 'conectesus') {
      setSusOpen(true)
      return
    }
    if (option.portalType === 'unimed' || option.portalType === 'amil' || option.portalType === 'bradesco_saude') {
      setInsuranceOpen({ portal: option.portalType, label: option.title })
      return
    }
    if (option.portalType === 'mater_dei' || option.portalType === 'hermes_pardini') {
      navigate(`/patients/${selfPatientId}?tab=integrations`)
    }
  }

  return (
    <div data-testid={`onboarding-connector-${kind}`}>
      <Title level={3} style={{ marginBottom: 4 }}>{t(stepDef.titleKey)}</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>{t(stepDef.subtitleKey)}</Text>
      <Text type="secondary" style={{ display: 'block', marginBottom: 20, fontSize: 13 }}>
        {t('onboarding.connectors.educationalHint')}
      </Text>

      <Row gutter={[12, 12]}>
        {stepDef.options.map((option) => (
          <Col xs={24} sm={12} key={option.id}>
            <Card
              hoverable
              size="small"
              onClick={() => openOption(option.id)}
              styles={{ body: { padding: 16 } }}
            >
              <Space align="start">
                <BrandLogo brand={option.brand} size={40} />
                <div>
                  <Text strong>{option.title}</Text>
                  <div><Text type="secondary" style={{ fontSize: 12 }}>{option.description}</Text></div>
                </div>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Space direction="vertical" style={{ width: '100%', marginTop: 24 }}>
        <Button type="primary" block size="large" onClick={onContinue}>
          {isLast ? t('onboarding.connectors.finish') : t('onboarding.continue')}
        </Button>
        <Button type="link" block onClick={skip} data-testid={`onboarding-connector-skip-${kind}`}>
          {t('onboarding.connectors.skip')}
        </Button>
        <Text type="secondary" style={{ fontSize: 12, textAlign: 'center', display: 'block' }}>
          <Link to={profileIntegrationsHref}>{t('onboarding.connectors.profileLink')}</Link>
        </Text>
      </Space>

      <PublicHealthIntegrationModal
        open={susOpen}
        portal={susOpen ? 'conectesus' : null}
        patientId={selfPatientId}
        onClose={() => setSusOpen(false)}
      />
      {insuranceOpen && (
        <ImportInsuranceModal
          open
          portal={insuranceOpen.portal}
          label={insuranceOpen.label}
          patientId={selfPatientId}
          usesEmail={insuranceOpen.portal === 'unimed'}
          onClose={() => setInsuranceOpen(null)}
        />
      )}
    </div>
  )
}
