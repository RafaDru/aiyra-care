import { useEffect, useState } from 'react'
import { Alert, Button, Space, Typography } from 'antd'
import { CloudDownloadOutlined, SyncOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api.js'
import type { GovBrSessionView } from '../../lib/api.types.js'

const { Text } = Typography

interface Props {
  patientId: string
  patientCpf?: string | null
  onReimport: () => void
  onImported?: () => void
}

export function SusPublicHealthBanner({ patientId, patientCpf, onReimport, onImported }: Props) {
  const { t } = useTranslation()
  const [govbr, setGovbr] = useState<GovBrSessionView | null>(null)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    api.account.govbrSession()
      .then(setGovbr)
      .catch(() => setGovbr(null))
  }, [patientId])

  const lastFetch = govbr?.conectesusLastFetchAt
  const lastLabel = lastFetch
    ? new Date(lastFetch).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
    : null

  const handleQuickSync = async () => {
    setSyncing(true)
    try {
      const r = await api.patients.conectesusSync(patientId)
      if (r.skipped === 'session_required') {
        onReimport()
        return
      }
      const session = await api.account.govbrSession().catch(() => null)
      if (session) setGovbr(session)
      onImported?.()
    } finally {
      setSyncing(false)
    }
  }

  const description = govbr?.sessionReady
    ? lastLabel
      ? t('vaccine.conecteSus.descriptionReadyWithDate', { date: lastLabel })
      : t('vaccine.conecteSus.descriptionReady')
    : t('vaccine.conecteSus.descriptionFirstTime')

  return (
    <Alert
      type="info"
      showIcon
      style={{ marginBottom: 16 }}
      message={t('vaccine.conecteSus.title')}
      description={
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Text type="secondary">{description}</Text>
          {!patientCpf && (
            <Text type="warning">{t('vaccine.conecteSus.cpfWarning')}</Text>
          )}
          <Space wrap>
            <Button
              size="small"
              icon={<CloudDownloadOutlined />}
              onClick={onReimport}
              disabled={!patientCpf}
            >
              {t('vaccine.conecteSus.guidedImport')}
            </Button>
            {govbr?.sessionReady && patientCpf && (
              <Button
                size="small"
                icon={<SyncOutlined />}
                loading={syncing}
                onClick={() => void handleQuickSync()}
              >
                {t('vaccine.conecteSus.reimportNow')}
              </Button>
            )}
          </Space>
        </Space>
      }
    />
  )
}
