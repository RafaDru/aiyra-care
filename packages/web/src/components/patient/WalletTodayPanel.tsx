import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Empty, List, Space, Spin, Tag, Typography } from 'antd'
import {
  BellOutlined,
  CalendarOutlined,
  MedicineBoxOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  CarryOutOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api.js'
import type { CareReminderRow, MonitoringTimelineRow, Patient, ScheduledEvent } from '../../lib/api.types.js'
import { requestQuickCaptureOpen } from '../../lib/quick-capture-bus.js'
import { requestConsultVisitOpen } from '../../lib/clinical-export-bus.js'
import { AvaPatientLensSelect } from '../ava/AvaPatientLensSelect.js'
import './wallet-today-panel.css'

const { Text, Title } = Typography

type TodayItemKind = 'agenda' | 'reminder' | 'timeline'

interface TodayItem {
  id: string
  kind: TodayItemKind
  at: string
  title: string
  subtitle?: string
  tag?: string
  tagColor?: string
  scheduledEventId?: string
  reminderId?: string
}

interface Props {
  patientId: string
  refreshKey?: number
  patients?: Patient[]
  routePatientId?: string | null
  onPatientChange?: (id: string) => void
}

function isToday(iso: string): boolean {
  return dayjs(iso).isSame(dayjs(), 'day')
}

function isTodayOrOverdue(iso: string): boolean {
  const d = dayjs(iso)
  return d.isSame(dayjs(), 'day') || d.isBefore(dayjs(), 'day')
}

function timelineKindTag(row: MonitoringTimelineRow): { tag: string; color: string } {
  if (row.kind === 'medication') return { tag: 'Medicação', color: 'purple' }
  if (row.kind === 'symptom') return { tag: 'Sintoma', color: 'orange' }
  return { tag: 'Medida', color: 'blue' }
}

export function WalletTodayPanel({
  patientId,
  refreshKey = 0,
  patients,
  routePatientId,
  onPatientChange,
}: Props) {
  const { t } = useTranslation()
  const lensPatients = patients ?? []
  const showPatientPicker = lensPatients.length > 0 && Boolean(onPatientChange)
  const activePatient = lensPatients.find((p) => p.id === patientId) ?? null
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<TodayItem[]>([])
  const [actingId, setActingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const from = dayjs().startOf('day').toISOString()
    const to = dayjs().endOf('day').toISOString()
    try {
      const [events, reminders, timeline] = await Promise.all([
        api.scheduledEvents.list(patientId, { status: 'planned' }),
        api.careReminders.pending(patientId),
        api.measurements.timeline({ patientId, from, to }),
      ])

      const merged: TodayItem[] = []

      for (const e of events as ScheduledEvent[]) {
        if (!isToday(e.scheduledAt)) continue
        merged.push({
          id: `agenda-${e.id}`,
          kind: 'agenda',
          at: e.scheduledAt,
          title: e.title,
          subtitle: e.description ?? undefined,
          tag: t(`agenda.kind.${e.kind}`),
          tagColor: e.kind === 'appointment' ? 'green' : 'geekblue',
          scheduledEventId: e.id,
        })
      }

      for (const r of reminders as CareReminderRow[]) {
        if (!isTodayOrOverdue(r.nextFireAt)) continue
        merged.push({
          id: `reminder-${r.id}`,
          kind: 'reminder',
          at: r.nextFireAt,
          title: r.title,
          subtitle: r.doseHint ? `${t('measurement.dose')}: ${r.doseHint}` : undefined,
          tag: t('walletToday.reminderTag'),
          tagColor: 'gold',
          reminderId: r.id,
        })
      }

      for (const row of timeline as MonitoringTimelineRow[]) {
        const kindMeta = timelineKindTag(row)
        merged.push({
          id: `timeline-${row.kind}-${row.id}`,
          kind: 'timeline',
          at: row.at,
          title: row.display,
          subtitle: row.notes ?? undefined,
          tag: kindMeta.tag,
          tagColor: kindMeta.color,
        })
      }

      merged.sort((a, b) => dayjs(a.at).valueOf() - dayjs(b.at).valueOf())
      setItems(merged)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [patientId, t])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  const markAgendaDone = async (eventId: string) => {
    setActingId(eventId)
    try {
      await api.scheduledEvents.update(eventId, { status: 'done' })
      await load()
    } finally {
      setActingId(null)
    }
  }

  const snoozeReminder = async (reminderId: string) => {
    setActingId(reminderId)
    try {
      await api.careReminders.snooze(reminderId, 30)
      await load()
    } finally {
      setActingId(null)
    }
  }

  return (
    <Card className="wallet-today-panel" size="small">
      <div className="wallet-today-panel__header">
        <div>
          <Title level={5} style={{ margin: 0 }}>{t('walletToday.title')}</Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t('walletToday.subtitle', { date: dayjs().format('dddd, DD/MM') })}
          </Text>
        </div>
        <Space wrap size="small">
          <Button
            size="small"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => requestQuickCaptureOpen({ patientId })}
          >
            {t('quickCapture.trigger')}
          </Button>
          <Button
            size="small"
            icon={<CarryOutOutlined />}
            onClick={() => requestConsultVisitOpen({ patientId })}
          >
            {t('walletToday.consultCta')}
          </Button>
        </Space>
      </div>

      {showPatientPicker && (
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 6, fontSize: 12 }}>
            {t('quickCapture.patientLabel')}
          </Text>
          <AvaPatientLensSelect
            patients={lensPatients}
            value={patientId}
            onChange={onPatientChange!}
            routePatientId={routePatientId}
          />
          {activePatient && (
            <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
              {activePatient.name}
            </Text>
          )}
        </div>
      )}

      {loading ? (
        <Spin size="small" style={{ display: 'block', margin: '16px auto' }} />
      ) : items.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('walletToday.empty')}
          style={{ margin: '12px 0 4px' }}
        >
          <Button type="link" size="small" onClick={() => requestQuickCaptureOpen({ patientId, kind: 'note' })}>
            {t('walletToday.emptyCta')}
          </Button>
        </Empty>
      ) : (
        <List
          className="wallet-today-panel__list"
          size="small"
          dataSource={items.slice(0, 12)}
          renderItem={(item) => (
            <List.Item
              actions={
                item.scheduledEventId
                  ? [
                      <Button
                        key="done"
                        type="link"
                        size="small"
                        loading={actingId === item.scheduledEventId}
                        onClick={() => void markAgendaDone(item.scheduledEventId!)}
                      >
                        {t('agenda.markDone')}
                      </Button>,
                    ]
                  : item.reminderId
                    ? [
                        <Button
                          key="snooze"
                          type="link"
                          size="small"
                          loading={actingId === item.reminderId}
                          onClick={() => void snoozeReminder(item.reminderId!)}
                        >
                          {t('walletToday.snooze')}
                        </Button>,
                      ]
                    : undefined
              }
            >
              <List.Item.Meta
                avatar={
                  item.kind === 'agenda'
                    ? <CalendarOutlined style={{ fontSize: 16, color: '#1677ff' }} />
                    : item.kind === 'reminder'
                      ? <BellOutlined style={{ fontSize: 16, color: '#faad14' }} />
                      : item.tag === 'Medicação'
                        ? <MedicineBoxOutlined style={{ fontSize: 16, color: '#722ed1' }} />
                        : <ThunderboltOutlined style={{ fontSize: 16, color: '#52c41a' }} />
                }
                title={
                  <Space size={6} wrap>
                    <Text>{item.title}</Text>
                    {item.tag && <Tag color={item.tagColor} style={{ margin: 0 }}>{item.tag}</Tag>}
                  </Space>
                }
                description={
                  <Space direction="vertical" size={0}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(item.at).format('HH:mm')}
                      {item.subtitle ? ` · ${item.subtitle}` : ''}
                    </Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  )
}
