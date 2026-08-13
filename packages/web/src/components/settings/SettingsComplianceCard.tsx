import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Card, Space, Spin, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api.js'
import type { ComplianceStatus, LegalDocumentKind } from '../../lib/api.types.js'
import { COMPLIANCE_ACCEPT_PATH } from '../../lib/legal-paths.js'
import { SETTINGS_PATHS } from '../../lib/settings-paths.js'
import { LegalDocumentModal } from '../legal/LegalDocumentModal.js'

const { Title, Text } = Typography

function kindLabel(kind: LegalDocumentKind, t: (k: string) => string): string {
  if (kind === 'terms_of_use') return t('legal.termsLink')
  if (kind === 'privacy_policy') return t('legal.privacyLink')
  if (kind === 'cookie_policy') return t('legal.cookiePolicyLink')
  if (kind === 'minor_guardian_consent') return t('legal.minorConsentLink')
  return kind
}

export function SettingsComplianceCard() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<ComplianceStatus | null>(null)
  const [legalModalKind, setLegalModalKind] = useState<LegalDocumentKind | null>(null)

  useEffect(() => {
    api.compliance.status()
      .then(setStatus)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Card>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          <Spin />
        </div>
      </Card>
    )
  }

  return (
    <>
      <LegalDocumentModal
        kind={legalModalKind}
        open={legalModalKind !== null}
        onClose={() => setLegalModalKind(null)}
        returnPath={SETTINGS_PATHS.legal}
      />
      <Card>
        <Title level={5} style={{ marginTop: 0 }}>{t('settings.legalAcceptTitle')}</Title>
        <Text type="secondary">{t('settings.legalAcceptSubtitle')}</Text>

        {status && !status.compliant && (
          <Alert
            type="warning"
            showIcon
            style={{ marginTop: 12 }}
            message={t('legal.pendingHint')}
            description={
              <Space direction="vertical" size={8} style={{ marginTop: 4 }}>
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
                <Link to={COMPLIANCE_ACCEPT_PATH}>{t('compliance.acceptCta')}</Link>
              </Space>
            }
          />
        )}

        {status?.compliant && (
          <Alert type="success" showIcon style={{ marginTop: 12 }} message={t('accountPlan.legalOk')} />
        )}
      </Card>
    </>
  )
}
