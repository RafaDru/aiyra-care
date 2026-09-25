import { useEffect, useMemo, useState } from 'react'
import { Empty, Space, Table, Tag, Typography } from 'antd'
import { opsApi } from './api.js'
import { OpsPanel } from './components/OpsPanel.js'
import {
  LifecycleDetailDrawer,
  type LifecycleDrawerState,
} from './LifecycleDetailDrawer.js'
import type { ProductLifecycleSnapshot } from './ops.types.js'

const { Text, Link } = Typography

const STATUS_COLOR: Record<string, string> = {
  done: 'success',
  in_progress: 'processing',
  planned: 'default',
  blocked: 'error',
}

const PRIORITY_COLOR: Record<string, string> = {
  P0: 'red',
  P1: 'volcano',
  P2: 'orange',
  P3: 'gold',
  P4: 'blue',
}

function featureDocHref(doc: string): string {
  return `/api/product-lifecycle/markdown?path=${encodeURIComponent(doc)}`
}

export function ProdutoLifecyclePanel() {
  const [data, setData] = useState<ProductLifecycleSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [drawer, setDrawer] = useState<LifecycleDrawerState>(null)

  useEffect(() => {
    opsApi.productLifecycle()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Falha ao carregar'))
      .finally(() => setLoading(false))
  }, [])

  const featuresByStatus = useMemo(() => {
    if (!data) return { in_progress: [], done: [], planned: [] as ProductLifecycleSnapshot['features'] }
    const groups = { in_progress: [], done: [], planned: [] } as Record<string, typeof data.features>
    for (const f of data.features) {
      const key = f.status === 'in_progress' ? 'in_progress' : f.status === 'done' ? 'done' : 'planned'
      groups[key].push(f)
    }
    return groups
  }, [data])

  if (loading) {
    return (
      <OpsPanel title="Ciclo de vida" description="Carregando roadmap e features…">
        <Text type="secondary">…</Text>
      </OpsPanel>
    )
  }
  if (error) return <OpsPanel title="Ciclo de vida"><Text type="danger">{error}</Text></OpsPanel>
  if (!data) return <Empty description="Sem dados de produto" />

  return (
    <>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <OpsPanel
          title="Ciclo de vida"
          description={`roadmap ${data.roadmapUpdatedAt ?? '—'} · features ${data.featuresUpdatedAt ?? '—'} · repositório local`}
        >
          <Text type="secondary">
            Status e prioridade vêm de <Text code>docs/roadmap.json</Text> e{' '}
            <Text code>docs/features/index.json</Text> — não variam por ambiente de deploy.
          </Text>
        </OpsPanel>

        <OpsPanel
          title={`Épicos em andamento (${data.epicsInProgress.length})`}
          description="Clique no épico para ver itens e abrir feature cards"
        >
          {data.epicsInProgress.length === 0 ? (
            <Text type="secondary">Nenhum épico em andamento.</Text>
          ) : (
            <Table
              size="small"
              pagination={false}
              rowKey="id"
              dataSource={data.epicsInProgress}
              onRow={(row) => ({
                className: 'ops-row-clickable',
                onClick: () => setDrawer({ kind: 'epic', epicId: row.id }),
              })}
              columns={[
                {
                  title: 'Prioridade',
                  dataIndex: 'priority',
                  width: 72,
                  render: (p: string) => <Tag color={PRIORITY_COLOR[p] ?? 'default'}>{p}</Tag>,
                },
                { title: 'Épico', dataIndex: 'title' },
                { title: 'ID', dataIndex: 'id', width: 180, render: (id: string) => <Text code>{id}</Text> },
                {
                  title: 'Itens ativos',
                  dataIndex: 'inProgressItems',
                  width: 100,
                  align: 'center' as const,
                },
                {
                  title: 'Status',
                  dataIndex: 'statusLabel',
                  width: 160,
                  render: (label: string | undefined, row) => (
                    <Tag color={STATUS_COLOR[row.status] ?? 'default'}>{label ?? row.status}</Tag>
                  ),
                },
              ]}
            />
          )}
        </OpsPanel>

        <OpsPanel
          title="Features — em andamento"
          description={`${featuresByStatus.in_progress.length} card(s) · clique para preview`}
        >
          {featuresByStatus.in_progress.length === 0 ? (
            <Text type="secondary">Nenhuma feature in_progress.</Text>
          ) : (
            <FeatureTable
              rows={featuresByStatus.in_progress}
              onOpen={(id) => setDrawer({ kind: 'feature', featureId: id })}
            />
          )}
        </OpsPanel>

        <OpsPanel title="Features — todas" description={`${data.features.length} no índice`}>
          <FeatureTable
            rows={data.features}
            onOpen={(id) => setDrawer({ kind: 'feature', featureId: id })}
          />
        </OpsPanel>
      </Space>

      <LifecycleDetailDrawer
        state={drawer}
        onClose={() => setDrawer(null)}
        onOpenFeature={(featureId, meta) =>
          setDrawer({
            kind: 'feature',
            featureId,
            itemTitle: meta?.itemTitle,
            itemDetail: meta?.itemDetail,
          })
        }
      />
    </>
  )
}

function FeatureTable({
  rows,
  onOpen,
}: {
  rows: ProductLifecycleSnapshot['features']
  onOpen: (featureId: string) => void
}) {
  return (
    <Table
      size="small"
      pagination={{ pageSize: 12, hideOnSinglePage: true }}
      rowKey="id"
      dataSource={rows}
      onRow={(row) => ({
        className: 'ops-row-clickable',
        onClick: () => onOpen(row.id),
      })}
      columns={[
        {
          title: 'Status',
          dataIndex: 'status',
          width: 110,
          render: (s: string) => <Tag color={STATUS_COLOR[s] ?? 'default'}>{s}</Tag>,
        },
        {
          title: 'P',
          dataIndex: 'priority',
          width: 56,
          render: (p: string) => <Tag color={PRIORITY_COLOR[p] ?? 'default'}>{p}</Tag>,
        },
        { title: 'Feature', dataIndex: 'title' },
        { title: 'Épico', dataIndex: 'epicId', width: 160, render: (id?: string) => id ? <Text code>{id}</Text> : '—' },
        {
          title: 'Suite QA',
          dataIndex: 'suiteId',
          width: 200,
          render: (_: unknown, row) => {
            if (!row.suiteId) return <Text type="secondary">—</Text>
            const cmd = `npm run qa:run -- --suite ${row.suiteId}`
            return (
              <Space direction="vertical" size={0}>
                <Text code style={{ fontSize: 11 }}>{row.suiteId}</Text>
                {row.suiteDoc && (
                  <Link href={featureDocHref(row.suiteDoc)} target="_blank" style={{ fontSize: 11 }}>
                    suite
                  </Link>
                )}
                <Text type="secondary" style={{ fontSize: 10 }} copyable={{ text: cmd }}>{cmd}</Text>
              </Space>
            )
          },
        },
        {
          title: 'Doc',
          dataIndex: 'doc',
          width: 120,
          render: (doc: string, row) => (
            <Link
              href="#"
              style={{ fontSize: 11 }}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onOpen(row.id)
              }}
            >
              card
            </Link>
          ),
        },
      ]}
    />
  )
}
