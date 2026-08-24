import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Checkbox, Space, Spin, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { AuthPageLayout } from '../layouts/AuthPageLayout.js'
import { LegalDocumentModal } from '../components/legal/LegalDocumentModal.js'
import { api } from '../lib/api.js'
import type { ComplianceStatus, LegalDocumentKind } from '../lib/api.types.js'
import { COMPLIANCE_ACCEPT_PATH } from '../lib/legal-paths.js'

const { Title, Text } = Typography

function kindLabel(kind: LegalDocumentKind, t: (k: string) => string): string {
  if (kind === 'terms_of_use') return t('legal.termsLink')
  if (kind === 'privacy_policy') return t('legal.privacyLink')
  if (kind === 'cookie_policy') return t('legal.cookiePolicyLink')
  if (kind === 'minor_guardian_consent') return t('legal.minorConsentLink')
  return kind
}

export function ComplianceAcceptPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<ComplianceStatus | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [legalModalKind, setLegalModalKind] = useState<LegalDocumentKind | null>(null)

  useEffect(() => {
    api.compliance.status()
      .then((s) => {
        setStatus(s)
        if (s.compliant) navigate('/', { replace: true })
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [navigate])

  const onSubmit = async () => {
    if (!accepted) return
    setSubmitting(true)
    setError(null)
    try {
      const next = await api.compliance.accept()
      setStatus(next)
      if (next.compliant) {
        // Notifica o RequireCompliance (valida 1x por sessão) sem reload
        window.dispatchEvent(new Event('aiyracare:compliance-accepted'))
        navigate('/', { replace: true })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <AuthPageLayout>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      </AuthPageLayout>
    )
  }

  return (
    <AuthPageLayout>
      <LegalDocumentModal
        kind={legalModalKind}
        open={legalModalKind !== null}
        onClose={() => setLegalModalKind(null)}
        returnPath={COMPLIANCE_ACCEPT_PATH}
      />
      <Card style={{ maxWidth: 520 }}>
        <Title level={3} style={{ marginBottom: 8 }}>{t('compliance.acceptTitle')}</Title>
        <Text type="secondary">{t('compliance.acceptSubtitle')}</Text>

        {error && <Alert type="error" message={error} showIcon style={{ marginTop: 16 }} />}

        {status && !status.compliant && (
          <Space direction="vertical" size="middle" style={{ width: '100%', marginTop: 20 }}>
            <Alert type="info" showIcon message={t('legal.acceptRequired')} />
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {status.pendingKinds.map((kind) => (
                <li key={kind}>
                  <Button
                    type="link"
                    size="small"
                    style={{ padding: 0, height: 'auto' }}
                    onClick={() => setLegalModalKind(kind)}
                  >
                    {kindLabel(kind, t)}
                  </Button>
                </li>
              ))}
            </ul>
            <Checkbox checked={accepted} onChange={(e) => setAccepted(e.target.checked)}>
              {t('compliance.acceptCheckbox')}
            </Checkbox>
            <Button
              type="primary"
              block
              size="large"
              disabled={!accepted}
              loading={submitting}
              onClick={onSubmit}
            >
              {t('legal.acceptButton')}
            </Button>
          </Space>
        )}
      </Card>
    </AuthPageLayout>
  )
}
