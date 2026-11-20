import { Button, Card, Space, Typography } from 'antd'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { LegalDocumentLayout } from '../layouts/LegalDocumentLayout.js'
import { useAuth } from '../contexts/AuthContext.js'

const { Paragraph, Text, Title } = Typography

export function CentralAtendimentoPage() {
  const { t } = useTranslation()
  const { session, signOut } = useAuth()
  const [searchParams] = useSearchParams()
  const fromOnboardingCpf = searchParams.get('context') === 'onboarding-cpf'

  return (
    <LegalDocumentLayout>
      <Card className="legal-document-card" variant="borderless">
        <Title level={2} style={{ marginTop: 0 }}>{t('supportCenter.title')}</Title>
        <Paragraph type="secondary">{t('supportCenter.subtitle')}</Paragraph>
        <Paragraph>{t('supportCenter.cpfRegisteredHint')}</Paragraph>
        <Paragraph>{t('supportCenter.authProblemsHint')}</Paragraph>
        {fromOnboardingCpf ? (
          <Paragraph>{t('supportCenter.onboardingCpfLoopHint')}</Paragraph>
        ) : null}
        <Paragraph>
          <Text strong>{t('supportCenter.channelsTitle')}</Text>
        </Paragraph>
        <Paragraph>{t('supportCenter.channelsHowTo')}</Paragraph>
        <Space wrap style={{ marginBottom: 16 }}>
          {session ? (
            <>
              <Link to="/">
                <Button type="primary">{t('supportCenter.ctaBackToApp')}</Button>
              </Link>
              <Button
                onClick={() => {
                  void signOut().then(() => {
                    window.location.href = '/login'
                  })
                }}
              >
                {t('supportCenter.ctaSignOutOtherEmail')}
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button type="primary">{t('supportCenter.ctaLogin')}</Button>
            </Link>
          )}
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
