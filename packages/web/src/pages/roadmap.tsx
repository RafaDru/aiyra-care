import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
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
  InboxOutlined,
  PlayCircleOutlined,
  SyncOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api.js'
import type {
  RoadmapData,
  RoadmapEpic,
  RoadmapItemStatus,
  RoadmapReviewBadge,
  HumanReviewQueueEntry,
} from '../lib/roadmap.types.js'
import { PageHeader } from '../components/ui/PageHeader.js'
import { DismissibleHint } from '../components/ui/DismissibleHint.js'
import { DevSessionsPanel } from '../components/dev/DevSessionsPanel.js'

const { Text, Paragraph, Title } = Typography

const STATUS_META: Record<
  RoadmapItemStatus,
  { color: string; icon: ReactNode; label: string }
> = {
  done: { color: 'success', icon: <CheckCircleOutlined />, label: 'Concluído' },
  in_progress: { color: 'processing', icon: <SyncOutlined spin />, label: 'Em progresso' },
  planned: { color: 'default', icon: <ClockCircleOutlined />, label: 'Planejado' },
  blocked: { color: 'error', icon: <CloseCircleOutlined />, label: 'Bloqueado' },
}

const PRIORITY_ORDER = ['P0', 'P1', 'P2', 'P3', 'P4']

type WorkflowQueue = 'in_progress' | 'planned' | 'done'

/** Ordem na lista: ativo → planejado → concluído */
const ITEM_STATUS_SORT: Record<RoadmapItemStatus, number> = {
  in_progress: 0,
  blocked: 1,
  planned: 2,
  done: 3,
}

function sortEpicItems(items: RoadmapEpic['items']) {
  return [...items].sort((a, b) => {
    const oa = ITEM_STATUS_SORT[a.status] ?? 2
    const ob = ITEM_STATUS_SORT[b.status] ?? 2
    if (oa !== ob) return oa - ob
    return a.title.localeCompare(b.title, 'pt-BR')
  })
}

function epicProgress(epic: RoadmapEpic): { done: number; total: number; percent: number } {
  const total = epic.items.length
  const done = epic.items.filter((i) => i.status === 'done').length
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 }
}

function epicQueue(epic: RoadmapEpic): WorkflowQueue {
  if (epic.status === 'done') return 'done'
  if (epic.status === 'in_progress' || epic.status === 'blocked') return 'in_progress'
  return 'planned'
}

function sortEpics(epics: RoadmapEpic[]): RoadmapEpic[] {
  return [...epics].sort((a, b) => {
    const pa = PRIORITY_ORDER.indexOf(a.priority)
    const pb = PRIORITY_ORDER.indexOf(b.priority)
    const ai = pa >= 0 ? pa : 99
    const bi = pb >= 0 ? pb : 99
    if (ai !== bi) return ai - bi
    return a.title.localeCompare(b.title, 'pt-BR')
  })
}

function normalizeReviewBadges(badge?: string | string[]): string[] {
  if (!badge) return []
  return Array.isArray(badge) ? badge : [badge]
}

function collectHumanReviewQueue(data: RoadmapData): HumanReviewQueueEntry[] {
  const entries: HumanReviewQueueEntry[] = []
  for (const epic of data.epics) {
    for (const item of epic.items) {
      const badges = normalizeReviewBadges(item.reviewBadge)
      if (badges.length === 0) continue
      if (item.status === 'done') continue
      entries.push({ epicId: epic.id, epicTitle: epic.title, item, badges })
    }
  }
  return entries.sort((a, b) => {
    const sa = ITEM_STATUS_SORT[a.item.status] ?? 2
    const sb = ITEM_STATUS_SORT[b.item.status] ?? 2
    if (sa !== sb) return sa - sb
    return a.item.title.localeCompare(b.item.title, 'pt-BR')
  })
}

function ReviewBadgeTags({
  badgeIds,
  badgeCatalog,
  size = 'small',
}: {
  badgeIds: string[]
  badgeCatalog: RoadmapReviewBadge[]
  size?: 'small' | 'default'
}) {
  if (badgeIds.length === 0) return null
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
      {badgeIds.map((id) => {
        const def = badgeCatalog.find((b) => b.id === id)
        return (
          <Tag
            key={id}
            color={def?.color ?? 'default'}
            style={{ margin: 0, fontSize: size === 'small' ? 11 : 12 }}
            title={def ? `${def.profession}: ${def.description ?? def.label}` : id}
          >
            {def?.label ?? id}
          </Tag>
        )
      })}
    </span>
  )
}

function ItemRow({
  title,
  status,
  detail,
  compact,
  reviewBadgeIds,
  badgeCatalog,
}: {
  title: string
  status: RoadmapItemStatus
  detail?: string
  compact?: boolean
  reviewBadgeIds?: string[]
  badgeCatalog?: RoadmapReviewBadge[]
}) {
  const meta = STATUS_META[status]
  const badges = reviewBadgeIds ?? []
  const catalog = badgeCatalog ?? []
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        marginBottom: compact ? 6 : 10,
      }}
    >
      <span style={{ marginTop: 2, opacity: status === 'done' ? 0.7 : 0.9 }}>{meta.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: compact ? 13 : undefined }}>{title}</Text>
        {badges.length > 0 && (
          <div style={{ marginTop: 4 }}>
            <ReviewBadgeTags badgeIds={badges} badgeCatalog={catalog} />
          </div>
        )}
        {detail && !compact && (
          <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0, marginTop: 4 }}>
            {detail}
          </Paragraph>
        )}
      </div>
      {!compact && <Tag color={meta.color} style={{ margin: 0 }}>{meta.label}</Tag>}
    </div>
  )
}

function DoneEpicDetail({ epic, data }: { epic: RoadmapEpic; data: RoadmapData }) {
  const catalog = data.reviewBadges ?? []
  return (
    <div>
      <Paragraph type="secondary" style={{ marginBottom: 10, fontSize: 13 }}>
        {epic.summary}
      </Paragraph>
      {sortEpicItems(epic.items).map((item) => (
        <ItemRow
          key={item.id}
          title={item.title}
          status={item.status}
          compact
          reviewBadgeIds={normalizeReviewBadges(item.reviewBadge)}
          badgeCatalog={catalog}
        />
      ))}
    </div>
  )
}

function EpicCard({
  epic,
  data,
}: {
  epic: RoadmapEpic
  data: RoadmapData
}) {
  const prog = epicProgress(epic)
  const epicMeta = STATUS_META[epic.status]
  const cat = epic.category ? data.categories?.find((c) => c.id === epic.category) : undefined
  const priority = data.priorities.find((p) => p.id === epic.priority)
  const badgeCatalog = data.reviewBadges ?? []
  const epicBadges = normalizeReviewBadges(epic.reviewBadge)

  return (
    <Card
      size="small"
      style={{ borderRadius: 12 }}
      title={
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <Text strong>{epic.title}</Text>
          {cat && <Tag color={cat.color}>{cat.label}</Tag>}
          {priority && <Tag color={priority.color}>{priority.label}</Tag>}
          {epicBadges.length > 0 && (
            <ReviewBadgeTags badgeIds={epicBadges} badgeCatalog={badgeCatalog} />
          )}
          <Tag color={epicMeta.color}>{epic.statusLabel ?? epicMeta.label}</Tag>
        </div>
      }
    >
      <Paragraph type="secondary" style={{ marginBottom: 12 }}>{epic.summary}</Paragraph>
      <Progress
        percent={prog.percent}
        size="small"
        format={() => `${prog.done}/${prog.total}`}
        style={{ marginBottom: 16 }}
      />
      {sortEpicItems(epic.items).map((item) => (
        <ItemRow
          key={item.id}
          title={item.title}
          status={item.status}
          detail={item.detail}
          reviewBadgeIds={normalizeReviewBadges(item.reviewBadge)}
          badgeCatalog={badgeCatalog}
        />
      ))}
    </Card>
  )
}

function HumanReviewQueueSection({
  data,
  entries,
}: {
  data: RoadmapData
  entries: HumanReviewQueueEntry[]
}) {
  const { t } = useTranslation()
  const catalog = data.reviewBadges ?? []

  if (entries.length === 0) return null

  return (
    <section style={{ marginBottom: 28 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 12,
          padding: '12px 16px',
          borderRadius: 12,
          border: '2px solid #faad14',
          background: 'color-mix(in srgb, #faad14 8%, transparent)',
        }}
      >
        <UserOutlined style={{ fontSize: 22, color: '#faad14' }} />
        <div>
          <Title level={4} style={{ margin: 0 }}>{t('roadmap.humanReview.title')}</Title>
          <Text type="secondary">{t('roadmap.humanReview.hint')}</Text>
        </div>
        <Badge count={entries.length} style={{ marginLeft: 'auto', backgroundColor: '#faad14' }} />
      </div>

      {catalog.length > 0 && (
        <Card size="small" style={{ marginBottom: 12, borderRadius: 12 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            {t('roadmap.humanReview.legend')}
          </Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {catalog.map((b) => (
              <Tag key={b.id} color={b.color} title={b.description}>
                {b.label} — {b.profession}
              </Tag>
            ))}
          </div>
        </Card>
      )}

      <Card size="small" style={{ borderRadius: 12 }}>
        {entries.map((entry) => (
          <div
            key={`${entry.epicId}-${entry.item.id}`}
            style={{
              padding: '10px 0',
              borderBottom: '1px solid var(--border-color, rgba(0,0,0,0.06))',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 4 }}>
              <Text strong>{entry.item.title}</Text>
              <Tag style={{ margin: 0 }}>{entry.epicTitle}</Tag>
              <Tag color={STATUS_META[entry.item.status].color} style={{ margin: 0 }}>
                {STATUS_META[entry.item.status].label}
              </Tag>
            </div>
            <ReviewBadgeTags badgeIds={entry.badges} badgeCatalog={catalog} />
            {entry.item.detail && (
              <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 6, marginBottom: 0 }}>
                {entry.item.detail}
              </Paragraph>
            )}
          </div>
        ))}
        <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}>
          {t('roadmap.humanReview.footer')}
        </Paragraph>
      </Card>
    </section>
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

  useEffect(() => {
    if (!loading && window.location.hash === '#dev-sessions') {
      document.getElementById('dev-sessions')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [loading])

  const queues = useMemo(() => {
    if (!data) {
      return { in_progress: [], planned: [], done: [] } as Record<WorkflowQueue, RoadmapEpic[]>
    }
    const buckets: Record<WorkflowQueue, RoadmapEpic[]> = {
      in_progress: [],
      planned: [],
      done: [],
    }
    for (const epic of data.epics) {
      buckets[epicQueue(epic)].push(epic)
    }
    return {
      in_progress: sortEpics(buckets.in_progress),
      planned: sortEpics(buckets.planned),
      done: sortEpics(buckets.done),
    }
  }, [data])

  const humanReviewQueue = useMemo(() => {
    if (!data) return []
    return collectHumanReviewQueue(data)
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

      <DismissibleHint
        hintId="roadmap.intro"
        type="info"
        showIcon
        message={t('roadmap.introTitle')}
        description={data.intro}
        style={{ marginBottom: 16, borderRadius: 12 }}
      />

      <Collapse
        ghost
        style={{ marginBottom: 16 }}
        items={[
          {
            key: 'principles',
            label: <Text strong>{t('roadmap.principlesTitle')}</Text>,
            children: (
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {data.principles.map((p) => (
                  <li key={p} style={{ marginBottom: 8 }}>
                    <Text type="secondary">{p}</Text>
                  </li>
                ))}
              </ul>
            ),
          },
        ]}
      />

      {data.categories && data.categories.length > 0 && (
        <Card size="small" style={{ marginBottom: 24, borderRadius: 12 }}>
          <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
            {t('roadmap.categoriesTitle')}
          </Title>
          <div style={{ display: 'grid', gap: 12 }}>
            {data.categories.map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  padding: 12,
                  borderRadius: 10,
                  background: 'var(--card-bg, rgba(0,0,0,0.02)',
                  border: '1px solid var(--border-color, rgba(0,0,0,0.06))',
                }}
              >
                <Tag color={c.color} style={{ margin: 0 }}>{c.label}</Tag>
                <Text type="secondary">{c.description}</Text>
              </div>
            ))}
          </div>
        </Card>
      )}

      <HumanReviewQueueSection data={data} entries={humanReviewQueue} />

      {/* Em execução */}
      <section style={{ marginBottom: 28 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 12,
            padding: '12px 16px',
            borderRadius: 12,
            border: '2px solid var(--primary, #1677ff)',
            background: 'color-mix(in srgb, var(--primary, #1677ff) 6%, transparent)',
          }}
        >
          <PlayCircleOutlined style={{ fontSize: 22, color: 'var(--primary, #1677ff)' }} />
          <div>
            <Title level={4} style={{ margin: 0 }}>{t('roadmap.queue.inProgressTitle')}</Title>
            <Text type="secondary">{t('roadmap.queue.inProgressHint')}</Text>
          </div>
          <Badge
            count={queues.in_progress.length}
            style={{ marginLeft: 'auto', backgroundColor: 'var(--primary)' }}
          />
        </div>
        {queues.in_progress.length === 0 ? (
          <Card size="small" style={{ borderRadius: 12 }}>
            <Text type="secondary">{t('roadmap.queue.inProgressEmpty')}</Text>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {queues.in_progress.map((epic) => (
              <EpicCard key={epic.id} epic={epic} data={data} />
            ))}
          </div>
        )}
      </section>

      {/* Backlog */}
      <section style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <InboxOutlined style={{ fontSize: 20 }} />
          <div>
            <Title level={4} style={{ margin: 0 }}>{t('roadmap.queue.backlogTitle')}</Title>
            <Text type="secondary">{t('roadmap.queue.backlogHint')}</Text>
          </div>
          <Badge count={queues.planned.length} style={{ marginLeft: 'auto' }} />
        </div>
        {queues.planned.length === 0 ? (
          <Card size="small" style={{ borderRadius: 12 }}>
            <Text type="secondary">{t('roadmap.queue.backlogEmpty')}</Text>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {queues.planned.map((epic) => (
              <EpicCard key={epic.id} epic={epic} data={data} />
            ))}
          </div>
        )}
      </section>

      {/* Executado */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <CheckCircleOutlined style={{ fontSize: 20, color: '#52c41a' }} />
          <div>
            <Title level={4} style={{ margin: 0 }}>{t('roadmap.queue.doneTitle')}</Title>
            <Text type="secondary">{t('roadmap.queue.doneHint')}</Text>
          </div>
          <Badge count={queues.done.length} style={{ marginLeft: 'auto', backgroundColor: '#52c41a' }} />
        </div>
        {queues.done.length === 0 ? (
          <Text type="secondary">{t('roadmap.queue.doneEmpty')}</Text>
        ) : (
          <Collapse
            bordered={false}
            style={{ background: 'transparent' }}
            items={queues.done.map((epic) => {
              const prog = epicProgress(epic)
              const cat = epic.category
                ? data.categories?.find((c) => c.id === epic.category)
                : undefined
              return {
                key: epic.id,
                label: (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text>{epic.title}</Text>
                    {cat && <Tag color={cat.color} style={{ margin: 0 }}>{cat.label}</Tag>}
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {prog.done}/{prog.total}
                    </Text>
                  </span>
                ),
                children: <DoneEpicDetail epic={epic} data={data} />,
                style: {
                  marginBottom: 8,
                  background: 'var(--card-bg)',
                  borderRadius: 10,
                  border: '1px solid var(--border-color, rgba(0,0,0,0.06))',
                },
              }
            })}
          />
        )}
      </section>

      <Paragraph type="secondary" style={{ marginTop: 24, fontSize: 12 }}>
        {t('roadmap.footer')}
      </Paragraph>

      <section id="dev-sessions" style={{ marginTop: 32 }}>
        <Title level={4} style={{ marginBottom: 4 }}>{t('session.title')}</Title>
        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          {t('session.subtitle')}
        </Paragraph>
        <DevSessionsPanel />
      </section>
    </div>
  )
}
