import { Button, Card, Space, Typography } from 'antd'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { LegalDocumentLayout } from '../layouts/LegalDocumentLayout.js'

const { Paragraph, Text, Title } = Typography

export function CentralAtendimentoPage() {
  const { t } = useTranslation()

  return (
    <LegalDocumentLayout backTo="/login" backLabel={t('supportCenter.backToLogin')}>
      <Card className="legal-document-card" variant="borderless">
        <Title level={2} style={{ marginTop: 0 }}>{t('supportCenter.title')}</Title>
        <Paragraph type="secondary">{t('supportCenter.subtitle')}</Paragraph>
        <Paragraph>{t('supportCenter.cpfRegisteredHint')}</Paragraph>
        <Paragraph>{t('supportCenter.authProblemsHint')}</Paragraph>
        <Paragraph>
          <Text strong>{t('supportCenter.channelsTitle')}</Text>
        </Paragraph>
        <Paragraph>{t('supportCenter.channelsHowTo')}</Paragraph>
        <Space wrap style={{ marginBottom: 16 }}>
          <Link to="/login">
            <Button type="primary">{t('supportCenter.ctaLogin')}</Button>
          </Link>
        </Space>
        <Paragraph type="secondary" style={{ fontSize: 13 }}>
          {t('supportCenter.noPublicEmailNote')}
        </Paragraph>
        <Paragraph type="secondary" style={{ fontSize: 12 }}>
          <Trans
            i18nKey="supportCenter.legalLinks"
            components={{
              terms: <Link to="/termos" />,
              privacy: <Link to="/privacidade" />,
            }}
          />
        </Paragraph>
      </Card>
    </LegalDocumentLayout>
  )
}
