import { useEffect, useState } from 'react'
import { Button, Card, Space, Tag, Typography, App } from 'antd'
import { SyncOutlined, LinkOutlined, DisconnectOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api.js'
import type { GoogleCalendarStatus } from '../../lib/api.types.js'

const { Text, Title } = Typography

interface Props {
  patientId: string
  compact?: boolean
  onSynced?: () => void
}

export function OutlookCalendarConnectCard({ patientId, compact, onSynced }: Props) {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const [status, setStatus] = useState<GoogleCalendarStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const load = () => {
    setLoading(true)
    api.calendar.microsoftStatus(patientId)
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [patientId])

  const connect = async () => {
    setConnecting(true)
    try {
      const returnTo = `/patients/${patientId}?tab=agenda`
      const { url } = await api.calendar.microsoftOAuthStart(patientId, returnTo)
      if (url) window.location.href = url
      else message.warning(t('outlook.notConfigured'))
    } catch (err) {
      message.error(err instanceof Error ? err.message : t('outlook.connectError'))
    } finally {
      setConnecting(false)
    }
  }

  const sync = async () => {
    setSyncing(true)
    try {
      const result = await api.calendar.microsoftSync(patientId)
      message.success(
        t('outlook.syncSuccess', {
          imported: result.pull.imported,
          pushed: result.pushed,
          skipped: result.pull.skippedDuplicate,
        }),
      )
      onSynced?.()
      load()
    } catch (err) {
      message.error(err instanceof Error ? err.message : t('outlook.syncError'))
    } finally {
      setSyncing(false)
    }
  }

  const disconnect = async () => {
    try {
      await api.calendar.microsoftDisconnect(patientId)
      message.success(t('outlook.disconnected'))
      load()
    } catch (err) {
      message.error(err instanceof Error ? err.message : t('outlook.disconnectError'))
    }
  }

  if (loading) return <Card size="small" loading />

  if (!status?.configured) {
    if (compact) return null
    return (
      <Card size="small" style={{ marginBottom: 16 }}>
        <Text type="secondary">{t('outlook.notConfiguredHint')}</Text>
      </Card>
    )
  }

  return (
    <Card size="small" style={{ marginBottom: compact ? 0 : 16 }}>
      <Title level={5} style={{ marginTop: 0 }}>{t('outlook.title')}</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
        {t('outlook.subtitle')}
      </Text>
      {status.connected ? (
        <Space wrap>
          <Tag color="green">{t('outlook.connected')}</Tag>
          {status.calendarLabel && <Text type="secondary">{status.calendarLabel}</Text>}
          {status.lastSyncAt && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t('outlook.lastSync', { date: new Date(status.lastSyncAt).toLocaleString() })}
            </Text>
          )}
          <Button icon={<SyncOutlined />} loading={syncing} onClick={sync}>
            {t('outlook.syncNow')}
          </Button>
          <Button icon={<DisconnectOutlined />} onClick={disconnect}>
            {t('outlook.disconnect')}
          </Button>
        </Space>
      ) : (
        <Button type="primary" icon={<LinkOutlined />} loading={connecting} onClick={connect}>
          {t('outlook.connect')}
        </Button>
      )}
    </Card>
  )
}
