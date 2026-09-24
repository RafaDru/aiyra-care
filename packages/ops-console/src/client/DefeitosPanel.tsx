import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Empty,
  Input,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd'
import {
  PlayCircleOutlined,
  PullRequestOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import {
  defectReadyForPrCount,
  defectStatusColor,
  defectStatusLabel,
  formatBatchWindowHours,
} from './ch-defect-display.js'
import { OpsPanel } from './components/OpsPanel.js'
import { opsApi } from './api.js'
import type { PlatformDefectItem, PlatformDefectStatus } from './ops.types.js'

const { Text, Paragraph, Link } = Typography

const FILTER_STATUSES: Array<PlatformDefectStatus | 'all'> = [
  'all',
  'open',
  'in_fix',
  'ready_for_pr',
  'fixed',
]

function buildIncidentDeepLink(incidentId: string): string {
  const params = new URLSearchParams()
  params.set('group', 'operacao')
  params.set('tab', 'incidentes')
  params.set('investigationId', incidentId)
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`
}

export function DefeitosPanel({ onRefresh }: { onRefresh?: () => void }) {
  const [items, setItems] = useState<PlatformDefectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<PlatformDefectStatus | 'all'>('all')
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([])
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [batchConfig, setBatchConfig] = useState<{
    intervalMs: number
    readyCount: number
    nextWindowAt: string
  } | null>(null)
  const [branchDraft, setBranchDraft] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const includeFixed = statusFilter === 'all' || statusFilter === 'fixed'
      const statusParam =
        statusFilter === 'all' ? 'open,in_fix,ready_for_pr,fixed' : statusFilter
      const [defects, config] = await Promise.all([
        opsApi.platformDefects({ status: statusParam, includeFixed }),
        opsApi.defectPrBatchConfig().catch(() => null),
      ])
      setItems(defects.items)
      if (config) setBatchConfig(config)
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Falha ao carregar defeitos')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    void load()
  }, [load])

  const readyCount = useMemo(() => defectReadyForPrCount(items), [items])
  const displayReady = batchConfig?.readyCount ?? readyCount

  const openDetail = async (id: string) => {
    setExpandedRowKeys((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }

  const runAction = async (id: string, fn: () => Promise<unknown>, okMsg: string) => {
    setUpdatingId(id)
    try {
      await fn()
      message.success(okMsg)
      await load()
      await onRefresh?.()
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Falha na ação')
    } finally {
      setUpdatingId(null)
    }
  }

  const startFix = (id: string) =>
    runAction(id, () => opsApi.startPlatformDefectFix(id), 'Correção iniciada')

  const markReadyForPr = (id: string) => {
    const branchName = branchDraft[id]?.trim()
    return runAction(
      id,
      () =>
        opsApi.patchPlatformDefectStatus(id, {
          status: 'ready_for_pr',
          branchName: branchName || undefined,
        }),
      'Marcado pronto para PR',
    )
  }

  const markFixed = (id: string) =>
    runAction(
      id,
      () => opsApi.patchPlatformDefectStatus(id, { status: 'fixed', skipBatch: true }),
      'Defeito marcado como corrigido',
    )

  return (
    <OpsPanel
      title="Defeitos"
      description="Registros pós-triagem — GET /api/platform-defects (Postgres platform_defects)."
    >
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Text>
            <Text strong>{displayReady}</Text> prontos para PR
          </Text>
          {batchConfig && (
            <Text type="secondary">
              · próximo lote em {formatBatchWindowHours(batchConfig.intervalMs)} (
              {new Date(batchConfig.nextWindowAt).toLocaleString('pt-BR')})
            </Text>
          )}
          <Tooltip title="Lote automático — fatia E (worker)">
            <Button size="small" disabled icon={<PlayCircleOutlined />}>
              Rodar lote agora
            </Button>
          </Tooltip>
        </Space>
      </Card>

      <Space wrap style={{ marginBottom: 12 }}>
        {FILTER_STATUSES.map((s) => (
          <Button
            key={s}
            size="small"
            type={statusFilter === s ? 'primary' : 'default'}
            onClick={() => setStatusFilter(s)}
          >
            {s === 'all' ? 'Todos' : defectStatusLabel(s)}
          </Button>
        ))}
      </Space>

      {items.length === 0 && !loading ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nenhum defeito neste filtro" />
      ) : (
        <Table<PlatformDefectItem>
          size="small"
          rowKey="id"
          loading={loading}
          pagination={false}
          dataSource={items}
          expandable={{
            expandedRowKeys,
            onExpandedRowsChange: (keys) => setExpandedRowKeys(keys.map(String)),
            expandedRowRender: (row) => (
              <DefeitoDetail
                defectId={row.id}
                row={row}
                branchValue={branchDraft[row.id] ?? row.branchName ?? ''}
                onBranchChange={(v) => setBranchDraft((prev) => ({ ...prev, [row.id]: v }))}
              />
            ),
          }}
          columns={[
            {
              title: 'Título',
              dataIndex: 'title',
              ellipsis: true,
            },
            {
              title: 'Desde',
              dataIndex: 'firstSeenAt',
              width: 148,
              render: (v: string) => new Date(v).toLocaleString('pt-BR'),
            },
            {
              title: 'Incidentes',
              dataIndex: 'incidentCount',
              width: 88,
              align: 'center',
              render: (n: number | undefined) => n ?? 0,
            },
            {
              title: 'Status',
              dataIndex: 'status',
              width: 130,
              align: 'center',
              render: (s: PlatformDefectStatus) => (
                <Tag color={defectStatusColor(s)}>{defectStatusLabel(s)}</Tag>
              ),
            },
            {
              title: 'Ações',
              key: 'actions',
              width: 160,
              align: 'center',
              render: (_: unknown, row) => (
                <Space size={0} wrap>
                  <Tooltip title="Detalhe">
                    <Button
                      type="text"
                      size="small"
                      icon={<UnorderedListOutlined />}
                      onClick={() => void openDetail(row.id)}
                    />
                  </Tooltip>
                  {row.status === 'open' && (
                    <Button
                      type="link"
                      size="small"
                      loading={updatingId === row.id}
                      onClick={() => void startFix(row.id)}
                    >
                      Iniciar correção
                    </Button>
                  )}
                  {row.status === 'in_fix' && (
                    <Button
                      type="link"
                      size="small"
                      icon={<PullRequestOutlined />}
                      loading={updatingId === row.id}
                      onClick={() => void markReadyForPr(row.id)}
                    >
                      Pronto PR
                    </Button>
                  )}
                  {row.status === 'ready_for_pr' && (
                    <Button
                      type="link"
                      size="small"
                      loading={updatingId === row.id}
                      onClick={() => void markFixed(row.id)}
                    >
                      Corrigido
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      )}

      {items.some((d) => d.status === 'in_fix') && (
        <Paragraph type="secondary" style={{ marginTop: 12 }}>
          Branch (opcional) antes de «Pronto PR»: edite no detalhe expandido.
        </Paragraph>
      )}
    </OpsPanel>
  )
}

function DefeitoDetail({
  defectId,
  row,
  branchValue,
  onBranchChange,
}: {
  defectId: string
  row: PlatformDefectItem
  branchValue: string
  onBranchChange: (value: string) => void
}) {
  const [incidents, setIncidents] = useState<Array<{ id: string; title: string }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void opsApi
      .platformDefectDetail(defectId)
      .then((d) => {
        if (!cancelled) setIncidents(d.incidents)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [defectId])

  return (
    <div style={{ maxWidth: 720 }}>
      {row.triageSummary && (
        <Paragraph>
          <Text strong>Triagem:</Text> {row.triageSummary}
        </Paragraph>
      )}
      {row.triageArtifactPath && (
        <Paragraph>
          <Text strong>Artefato:</Text> <Text code>{row.triageArtifactPath}</Text>
        </Paragraph>
      )}
      {row.branchName && (
        <Paragraph>
          <Text strong>Branch:</Text> <Text code>{row.branchName}</Text>
        </Paragraph>
      )}
      {row.prUrl && (
        <Paragraph>
          <Text strong>PR:</Text>{' '}
          <Link href={row.prUrl} target="_blank" rel="noreferrer">{row.prUrl}</Link>
        </Paragraph>
      )}
      <Paragraph>
        <Text strong>Incidentes vinculados:</Text>{' '}
        {loading ? '…' : incidents.length === 0 ? '—' : null}
      </Paragraph>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {incidents.map((inc) => (
          <li key={inc.id}>
            <a href={buildIncidentDeepLink(inc.id)}>{inc.title}</a>
            <Text type="secondary"> · {inc.id.slice(0, 8)}</Text>
          </li>
        ))}
      </ul>
      {row.status === 'in_fix' && (
        <Paragraph style={{ marginTop: 8 }}>
          <Text type="secondary">Branch para PR:</Text>
          <Input
            size="small"
            style={{ marginTop: 4, maxWidth: 360 }}
            placeholder="cursor/fix-wallet-sync"
            value={branchValue}
            onChange={(e) => onBranchChange(e.target.value)}
          />
        </Paragraph>
      )}
    </div>
  )
}
