import { useCallback, useEffect, useMemo, useState } from 'react'
import { Select, Space, Spin, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api.js'
import type { PatientTimeline } from '../../lib/api.types.js'
import { PatientContextTimeline } from './PatientContextTimeline.js'

const { Text } = Typography

const TIMELINE_MONTH_OPTIONS = [6, 12, 24] as const

interface Props {
  patientId: string
}

export function AgendaTimelineHeader({ patientId }: Props) {
  const { t } = useTranslation()
  const [data, setData] = useState<PatientTimeline | null>(null)
  const [loading, setLoading] = useState(true)
  const [timelineMonths, setTimelineMonths] = useState(12)

  const load = useCallback(() => {
    setLoading(true)
    api.patients
      .timeline(patientId, { timelineMonths, limit: 80 })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [patientId, timelineMonths])

  useEffect(() => {
    load()
  }, [load])

  const events = useMemo(() => data?.events ?? [], [data])

  return (
    <section className="agenda-timeline-header" aria-label={t('agenda.timelineTitle')}>
      <div className="agenda-timeline-header__bar">
        <Text strong className="agenda-timeline-header__title">{t('agenda.timelineTitle')}</Text>
        <Space size="small" wrap>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {loading
              ? t('common.loading')
              : t('agenda.timelineEventCount', { count: data?.total ?? events.length })}
          </Text>
          <Select
            size="small"
            value={timelineMonths}
            onChange={setTimelineMonths}
            style={{ width: 120 }}
            options={TIMELINE_MONTH_OPTIONS.map((value) => ({
              value,
              label: t('agenda.timelineMonths', { count: value }),
            }))}
          />
        </Space>
      </div>
      {loading ? (
        <Spin size="small" style={{ display: 'block', margin: '12px auto' }} />
      ) : events.length > 0 ? (
        <PatientContextTimeline events={events} maxItems={14} showHeader={false} />
      ) : (
        <Text type="secondary" className="agenda-timeline-header__empty">
          {t('agenda.timelineEmpty')}
        </Text>
      )}
    </section>
  )
}
