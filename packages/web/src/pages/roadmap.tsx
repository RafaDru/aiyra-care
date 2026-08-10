import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Alert,
  Badge,
  Card,
  Collapse,
  Empty,
  Progress,
  Spin,
  Tag,
  Typography,
  App,
} from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  FlagOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api.js'
import type { RoadmapData, RoadmapEpic, RoadmapItemStatus } from '../lib/roadmap.types.js'
import { PageHeader } from '../components/ui/PageHeader.js'

const { Text, Paragraph } = Typography

const STATUS_META: Record<
  RoadmapItemStatus,
  { color: string; icon: ReactNode; label: string }
> = {
  done: { color: 'success', icon: <CheckCircleOutlined />, label: 'Concluído' },
  in_progress: { color: 'processing', icon: <SyncOutlined spin />, label: 'Em progresso' },
  planned: { color: 'default', icon: <ClockCircleOutlined />, label: 'Planejado' },
  blocked: { color: 'error', icon: <CloseCircleOutlined />, label: 'Bloqueado' },
}

function epicProgress(epic: RoadmapEpic): { done: number; total: number; percent: number } {
  const total = epic.items.length
  const done = epic.items.filter((i) => i.status === 'done').length
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 }
}

function ItemRow({ title, status, detail }: { title: string; status: RoadmapItemStatus; detail?: string }) {
  const meta = STATUS_META[status]
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
      <span style={{ marginTop: 2, opacity: status === 'done' ? 1 : 0.85 }}>{meta.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text>{title}</Text>
        {detail && (
          <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0, marginTop: 4 }}>
            {detail}
          </Paragraph>
        )}
      </div>
      <Tag color={meta.color} style={{ margin: 0 }}>{meta.label}</Tag>
    </div>
  )
}

export function RoadmapPage() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const [data, setData] = useState<RoadmapData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.roadmap
      .get()
      .then(setData)
      .catch((err) => message.error(err instanceof Error ? err.message : t('roadmap.loadError')))
      .finally(() => setLoading(false))
  }, [message, t])

  const epicsByPriority = useMemo(() => {
    if (!data) return new Map<string, RoadmapEpic[]>()
    const map = new Map<string, RoadmapEpic[]>()
    for (const epic of data.epics) {
      const list = map.get(epic.priority) ?? []
      list.push(epic)
      map.set(epic.priority, list)
    }
    return map
  }, [data])

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />

  if (!data) {
    return (
      <div>
        <PageHeader title={t('roadmap.title')} />
        <Empty description={t('roadmap.empty')} style={{ marginTop: 80 }} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={t('roadmap.title')}
        subtitle={t('roadmap.subtitle')}
        extra={
          <Tag icon={<FlagOutlined />}>
            {t('roadmap.updatedAt', { date: data.updatedAt })}
          </Tag>
        }
      />

      <Alert
        type="info"
        showIcon
        message={t('roadmap.introTitle')}
        description={data.intro}
        style={{ marginBottom: 16, borderRadius: 12 }}
      />

      <Card size="small" title={t('roadmap.principlesTitle')} style={{ marginBottom: 16, borderRadius: 12 }}>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {data.principles.map((p) => (
            <li key={p} style={{ marginBottom: 6 }}>
              <Text type="secondary">{p}</Text>
            </li>
          ))}
        </ul>
      </Card>

      {data.categories && data.categories.length > 0 && (
        <Card size="small" title={t('roadmap.categoriesTitle')} style={{ marginBottom: 16, borderRadius: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.categories.map((c) => (
              <div key={c.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Tag color={c.color}>{c.label}</Tag>
                <Text type="secondary">{c.description}</Text>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card size="small" title={t('roadmap.prioritiesTitle')} style={{ marginBottom: 24, borderRadius: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.priorities.map((p) => (
            <div key={p.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Tag color={p.color}>{p.label}</Tag>
              <Text type="secondary">{p.description}</Text>
            </div>
          ))}
        </div>
      </Card>

      <Collapse
        accordion={false}
        defaultActiveKey={data.priorities.map((p) => p.id)}
        style={{ borderRadius: 12, background: 'var(--card-bg)' }}
        items={data.priorities.map((priority) => {
          const epics = epicsByPriority.get(priority.id) ?? []
          return {
            key: priority.id,
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag color={priority.color}>{priority.label}</Tag>
                <Badge count={epics.length} style={{ backgroundColor: 'var(--primary)' }} />
              </span>
            ),
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {epics.length === 0 ? (
                  <Text type="secondary">{t('roadmap.noEpics')}</Text>
                ) : (
                  epics.map((epic) => {
                    const prog = epicProgress(epic)
                    const epicMeta = STATUS_META[epic.status]
                    const cat = epic.category
                      ? data.categories?.find((c) => c.id === epic.category)
                      : undefined
                    return (
                      <Card
                        key={epic.id}
                        size="small"
                        style={{ borderRadius: 12 }}
                        title={
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                            <Text strong>{epic.title}</Text>
                            {cat && <Tag color={cat.color}>{cat.label}</Tag>}
                            <Tag color={epicMeta.color}>
                              {epic.statusLabel ?? epicMeta.label}
                            </Tag>
                          </div>
                        }
                      >
                        <Paragraph type="secondary" style={{ marginBottom: 12 }}>
                          {epic.summary}
                        </Paragraph>
                        <Progress
                          percent={prog.percent}
                          size="small"
                          format={() => `${prog.done}/${prog.total}`}
                          style={{ marginBottom: 16 }}
                        />
                        {epic.items.map((item) => (
                          <ItemRow
                            key={item.id}
                            title={item.title}
                            status={item.status}
                            detail={item.detail}
                          />
                        ))}
                      </Card>
                    )
                  })
                )}
              </div>
            ),
          }
        })}
      />

      <Paragraph type="secondary" style={{ marginTop: 24, fontSize: 12 }}>
        {t('roadmap.footer')}
      </Paragraph>
    </div>
  )
}
