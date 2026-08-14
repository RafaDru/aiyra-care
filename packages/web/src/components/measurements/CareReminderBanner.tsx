import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Space } from 'antd'
import { BellOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api.js'
import type { CareReminderRow } from '../../lib/api.types.js'

interface Props {
  patientId: string
  onMeasure?: (reminder: CareReminderRow) => void
  onMedication?: (reminder: CareReminderRow) => void
}

export function CareReminderBanner({ patientId, onMeasure, onMedication }: Props) {
  const { t } = useTranslation()
  const [pending, setPending] = useState<CareReminderRow[]>([])

  const load = useCallback(() => {
    api.careReminders.pending(patientId).then(setPending).catch(() => setPending([]))
  }, [patientId])

  useEffect(() => {
    load()
    const id = window.setInterval(load, 60000)
    return () => window.clearInterval(id)
  }, [load])

  if (!pending.length) return null

  return (
    <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }} size="small">
      {pending.map((r) => (
        <Alert
          key={r.id}
          type="warning"
          showIcon
          icon={<BellOutlined />}
          message={r.title}
          description={r.doseHint ? `${t('measurement.dose')}: ${r.doseHint}` : undefined}
          action={
            <Space>
              <Button
                size="small"
                type="primary"
                onClick={() => {
                  if (r.reminderKind === 'medication') onMedication?.(r)
                  else onMeasure?.(r)
                }}
              >
                {r.reminderKind === 'medication' ? t('measurement.logMedication') : t('measurement.logVitals')}
              </Button>
              <Button
                size="small"
                icon={<ClockCircleOutlined />}
                onClick={() => api.careReminders.snooze(r.id).then(load)}
              >
                {t('measurement.snooze')}
              </Button>
            </Space>
          }
        />
      ))}
    </Space>
  )
}
