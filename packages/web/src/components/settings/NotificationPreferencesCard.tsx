import { useCallback, useEffect, useState } from 'react'
import { Alert, Card, Space, Switch, Typography, message } from 'antd'
import { BellOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api.js'

const { Text, Title } = Typography

export function NotificationPreferencesCard() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncEscalationEmail, setSyncEscalationEmail] = useState(false)

  useEffect(() => {
    let cancelled = false
    void api.notifications.getPreferences()
      .then((prefs) => {
        if (!cancelled) setSyncEscalationEmail(prefs.syncEscalationEmail)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const onToggle = useCallback(async (checked: boolean) => {
    setSaving(true)
    const prev = syncEscalationEmail
    setSyncEscalationEmail(checked)
    try {
      await api.notifications.updatePreferences(checked)
      void message.success(t('settings.notifications.saved'))
    } catch {
      setSyncEscalationEmail(prev)
      void message.error(t('settings.notifications.saveError'))
    } finally {
      setSaving(false)
    }
  }, [syncEscalationEmail, t])

  return (
    <Card>
      <Title level={5} style={{ marginTop: 0 }}>
        <BellOutlined style={{ marginRight: 8 }} />
        {t('settings.notifications.title')}
      </Title>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <Text strong style={{ display: 'block' }}>{t('settings.notifications.syncEscalation')}</Text>
            <Text type="secondary">{t('settings.notifications.syncEscalationHint')}</Text>
          </div>
          <Switch
            checked={syncEscalationEmail}
            loading={loading || saving}
            onChange={onToggle}
            aria-label={t('settings.notifications.syncEscalation')}
          />
        </div>
        <Alert type="info" showIcon message={t('settings.notifications.syncEscalationLegal')} />
      </Space>
    </Card>
  )
}
