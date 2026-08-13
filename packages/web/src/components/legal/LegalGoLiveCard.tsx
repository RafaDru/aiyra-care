import { useEffect, useState } from 'react'
import { Alert, Card, List, Tag, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api.js'
import type { GoLiveStatus } from '../../lib/api.types.js'

const { Title, Text } = Typography

function formatCnpj(cnpj: string | null): string {
  if (!cnpj || cnpj.length !== 14) return cnpj ?? '—'
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`
}

export function LegalGoLiveCard() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<GoLiveStatus | null>(null)

  useEffect(() => {
    api.compliance.goLiveStatus().then(setStatus).catch(() => setStatus(null))
  }, [])

  if (!status) return null

  return (
    <Card size="small">
      <Title level={5} style={{ marginTop: 0 }}>{t('legal.goLiveTitle')}</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
        {t('legal.goLiveSubtitle')}
      </Text>

      {status.readyForPublicBilling ? (
        <Alert type="success" showIcon message={t('legal.goLiveReadyBilling')} style={{ marginBottom: 12 }} />
      ) : (
        <Alert type="warning" showIcon message={t('legal.goLiveNotReady')} style={{ marginBottom: 12 }} />
      )}

      {status.publisher.complete && (
        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
          {status.publisher.entityName} — CNPJ {formatCnpj(status.publisher.cnpj)}
        </Text>
      )}

      <List
        size="small"
        dataSource={status.checklist}
        renderItem={(item) => (
          <List.Item>
            <Tag color={item.ok ? 'green' : 'default'}>{item.ok ? '✓' : '○'}</Tag>
            <span>{t(`legal.goLiveItem.${item.id}`, { defaultValue: item.id })}</span>
            {item.detail && (
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>{item.detail}</Text>
            )}
          </List.Item>
        )}
      />
    </Card>
  )
}
