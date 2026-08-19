import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, Checkbox, Collapse, DatePicker, Select, Space, Spin, Typography, Segmented, List, Tag, Empty } from 'antd'
import { AppstoreOutlined, UnorderedListOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import { api } from '../../../lib/api.js'
import type { PatientTimeline, PatientTimelineEvent, ClinicalFlow } from '../../../lib/api.types.js'
import {
  PatientContextTimeline,
  groupTimelineEventsByDay,
} from '../../../components/patient/PatientContextTimeline.js'
import { ClinicalEntityFlow } from '../../../components/patient/ClinicalEntityFlow.js'
import { TIMELINE_KIND_OPTIONS, timelineKindMeta } from '../../../components/patient/timeline-kind-meta.js'

const { Text } = Typography
const { RangePicker } = DatePicker

interface TimelineTabProps {
  patientId: string
}

type ViewMode = 'timeline' | 'list' | 'chain'

function formatDayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function TimelineListItem({ event }: { event: PatientTimelineEvent }) {
  const meta = timelineKindMeta(event.kind)
  const grouped = (event.count ?? 0) > 1 || (event.items?.length ?? 0) > 1

  return (
    <List.Item>
      <List.Item.Meta
        title={
          <Space wrap>
            <Tag color={meta.color}>{meta.label}</Tag>
            <Text strong>{event.title}</Text>
            {grouped && event.count != null && event.count > 1 && (
              <Tag>{event.count}</Tag>
            )}
          </Space>
        }
        description={
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            {event.subtitle && <Text type="secondary">{event.subtitle}</Text>}
            {grouped && event.items && (
              <List
                size="small"
                dataSource={event.items}
                renderItem={(item) => (
                  <List.Item style={{ padding: '4px 0' }}>
                    <Text style={{ fontSize: 13 }}>{item.title}</Text>
                    {item.subtitle && (
                      <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                        {item.subtitle}
                      </Text>
                    )}
                  </List.Item>
                )}
              />
            )}
            <Text type="secondary" style={{ fontSize: 12 }}>
              {new Date(event.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              {' · '}
              {event.source}
            </Text>
          </Space>
        }
      />
    </List.Item>
  )
}

export function TimelineTab({ patientId }: TimelineTabProps) {
  const [data, setData] = useState<PatientTimeline | null>(null)
  const [chainFlow, setChainFlow] = useState<ClinicalFlow | null>(null)
  const [chainError, setChainError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [kinds, setKinds] = useState<string[]>([])
  const [timelineMonths, setTimelineMonths] = useState(24)
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('timeline')

  const queryParams = useMemo(() => {
    const params: {
      timelineMonths?: number
      kinds?: string[]
      from?: string
      to?: string
      limit?: number
    } = { timelineMonths, limit: 200 }
    if (kinds.length > 0) params.kinds = kinds
    if (dateRange?.[0]) params.from = dateRange[0].startOf('day').toISOString()
    if (dateRange?.[1]) params.to = dateRange[1].endOf('day').toISOString()
    return params
  }, [kinds, timelineMonths, dateRange])

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    api.patients
      .timeline(patientId, queryParams)
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Erro ao carregar linha do tempo'))
      .finally(() => setLoading(false))
  }, [patientId, queryParams])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (viewMode !== 'chain') return
    setChainError(null)
    api.patients
      .graphClinicalPaths(patientId)
      .then(setChainFlow)
      .catch((e: unknown) => {
        setChainFlow(null)
        setChainError(e instanceof Error ? e.message : 'Encadeamento via grafo indisponível')
      })
  }, [patientId, viewMode])

  const events = data?.events ?? []
  const dayGroups = useMemo(
    () => [...groupTimelineEventsByDay(events)].sort((a, b) => b.key.localeCompare(a.key)),
    [events],
  )

  return (
    <div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space wrap>
            <Text strong>Período:</Text>
            <Select
              value={timelineMonths}
              onChange={setTimelineMonths}
              style={{ width: 140 }}
              options={[
                { value: 6, label: '6 meses' },
                { value: 12, label: '12 meses' },
                { value: 24, label: '24 meses' },
                { value: 36, label: '36 meses' },
                { value: 60, label: '5 anos' },
              ]}
            />
            <RangePicker
              value={dateRange}
              onChange={(range) => setDateRange(range)}
              format="DD/MM/YYYY"
              allowEmpty={[true, true]}
              placeholder={['De', 'Até']}
            />
          </Space>

          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Tipos de evento</Text>
            <Checkbox.Group
              options={TIMELINE_KIND_OPTIONS}
              value={kinds}
              onChange={(values) => setKinds(values as string[])}
            />
          </div>

          <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
            <Text type="secondary">
              {loading ? 'Carregando…' : `${data?.total ?? 0} evento(s)`}
            </Text>
            <Segmented
              value={viewMode}
              onChange={(v) => setViewMode(v as ViewMode)}
              options={[
                { value: 'timeline', icon: <AppstoreOutlined />, label: 'Linha' },
                { value: 'list', icon: <UnorderedListOutlined />, label: 'Lista' },
                { value: 'chain', icon: <AppstoreOutlined />, label: 'Encadeamento' },
              ]}
            />
          </Space>
        </Space>
      </Card>

      {loading && <Spin style={{ display: 'block', margin: '40px auto' }} />}
      {error && <Text type="danger">{error}</Text>}

      {!loading && !error && events.length === 0 && (
        <Empty description="Nenhum evento no período selecionado" />
      )}

      {!loading && !error && events.length > 0 && viewMode === 'timeline' && (
        <PatientContextTimeline events={events} maxItems={events.length} showHeader={false} />
      )}

      {!loading && !error && events.length > 0 && viewMode === 'list' && (
        <Collapse
          accordion={false}
          defaultActiveKey={dayGroups.slice(0, 3).map((g) => g.key)}
          items={dayGroups.map((day) => ({
            key: day.key,
            label: (
              <Space>
                <Text strong>{formatDayLabel(day.date)}</Text>
                <Text type="secondary">({day.events.length} tipo(s))</Text>
              </Space>
            ),
            children: (
              <List
                dataSource={day.events}
                renderItem={(event) => <TimelineListItem event={event} />}
              />
            ),
          }))}
        />
      )}

      {viewMode === 'chain' && chainError && (
        <Text type="secondary">{chainError}</Text>
      )}

      {viewMode === 'chain' && !chainError && chainFlow && chainFlow.nodes.length > 0 && (
        <ClinicalEntityFlow flow={chainFlow} />
      )}

      {viewMode === 'chain' && !chainError && chainFlow && chainFlow.nodes.length === 0 && (
        <Empty description="Sem encadeamentos no grafo — sincronize portais ou associe na sequência" />
      )}
    </div>
  )
}
