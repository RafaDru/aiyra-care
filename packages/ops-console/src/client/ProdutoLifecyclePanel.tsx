import { useEffect, useMemo, useState } from 'react'
import { Empty, Space, Table, Tag, Typography } from 'antd'
import { opsApi } from './api.js'
import { OpsPanel } from './components/OpsPanel.js'
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

export function ProdutoLifecyclePanel() {
  const [data, setData] = useState<ProductLifecycleSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    opsApi.productLifecycle()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Falha ao carregar'))
      .finally(() => setLoading(false))
  }, [])

  const featuresByStatus = useMemo(() => {
    if (!data) return { in_progress: [], done: [], planned: [] as typeof data.features }
    const groups = { in_progress: [], done: [], planned: [] } as Record<string, typeof data.features>
    for (const f of data.features) {
      const key = f.status === 'in_progress' ? 'in_progress' : f.status === 'done' ? 'done' : 'planned'
      groups[key].push(f)
    }
    return groups
  }, [data])

  if (loading) return <OpsPanel title="Produto" description="Carregando roadmap e features…" />
  if (error) return <OpsPanel title="Produto"><Text type="danger">{error}</Text></OpsPanel>
  if (!data) return <Empty description="Sem dados de produto" />

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <OpsPanel
        title="Produto — ciclo de vida"
        description={`Fonte: docs/roadmap.json + docs/features/index.json · roadmap ${data.roadmapUpdatedAt ?? '—'} · features ${data.featuresUpdatedAt ?? '—'}`}
      >
        <Text type="secondary">
          Épicos em andamento e cards de feature com status e suites QA. Dados do repositório local (não por ambiente).
        </Text>
      </OpsPanel>

      <OpsPanel
        title={`Épicos em andamento (${data.epicsInProgress.length})`}
        description="status = in_progress em docs/roadmap.json"
      >
        {data.epicsInProgress.length === 0 ? (
          <Text type="secondary">Nenhum épico em andamento.</Text>
        ) : (
          <Table
            size="small"
            pagination={false}
            rowKey="id"
            dataSource={data.epicsInProgress}
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
        description={`${featuresByStatus.in_progress.length} card(s)`}
      >
        {featuresByStatus.in_progress.length === 0 ? (
          <Text type="secondary">Nenhuma feature in_progress.</Text>
        ) : (
          <FeatureTable rows={featuresByStatus.in_progress} />
        )}
      </OpsPanel>

      <OpsPanel title="Features — todas" description={`${data.features.length} no índice`}>
        <FeatureTable rows={data.features} />
      </OpsPanel>
    </Space>
  )
}

function FeatureTable({ rows }: { rows: ProductLifecycleSnapshot['features'] }) {
  return (
    <Table
      size="small"
      pagination={{ pageSize: 12, hideOnSinglePage: true }}
      rowKey="id"
      dataSource={rows}
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
                  <Link href={`/${row.suiteDoc}`} target="_blank" style={{ fontSize: 11 }}>
                    {row.suiteDoc}
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
          render: (doc: string) => (
            <Link href={`/${doc}`} target="_blank" style={{ fontSize: 11 }}>card</Link>
          ),
        },
      ]}
    />
  )
}
