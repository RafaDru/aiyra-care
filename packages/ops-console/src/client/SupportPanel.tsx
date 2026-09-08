import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Descriptions, message, Segmented, Space, Table, Tag, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { SupportReportOpsRow } from './ops.types.js'
import { OpsKpiCard, OpsKpiGrid } from './components/OpsKpiCard.js'
import { OpsPanel } from './components/OpsPanel.js'
import { useOpsDrillDown } from './ops-drill-down.js'
import { opsApi } from './api.js'

const { Text } = Typography

const CATEGORY_LABEL: Record<string, string> = {
  technical_bug: 'Erro técnico',
  incorrect_data: 'Dado incorreto',
  ux_confusion: 'Confusão de UX',
  other: 'Outro',
}

const STATUS_LABEL: Record<string, string> = {
  open: 'Aberto',
  triaged: 'Triado',
  resolved: 'Resolvido',
  closed: 'Fechado',
}

type QueueStatus = 'open' | 'triaged' | 'resolved'

export function SupportPanel({
  openCount,
  submitted24h,
  onQueueChange,
}: {
  openCount: number
  submitted24h: number
  onQueueChange?: () => void
}) {
  const { open } = useOpsDrillDown()
  const [loading, setLoading] = useState(true)
  const [queueStatus, setQueueStatus] = useState<QueueStatus>('open')
  const [rows, setRows] = useState<SupportReportOpsRow[]>([])
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [localOpenCount, setLocalOpenCount] = useState(openCount)

  useEffect(() => {
    setLocalOpenCount(openCount)
  }, [openCount])

  const load = useCallback(async (status: QueueStatus = queueStatus) => {
    setLoading(true)
    try {
      const result = await opsApi.supportReports(status)
      setRows(result.reports)
      if (status === 'open') {
        setLocalOpenCount(result.reports.length)
      }
    } catch (err) {
      setRows([])
      message.error(err instanceof Error ? err.message : 'Falha ao carregar fila')
    } finally {
      setLoading(false)
    }
  }, [queueStatus])

  useEffect(() => {
    void load(queueStatus)
  }, [load, queueStatus])

  const setStatus = async (id: string, status: 'triaged' | 'resolved') => {
    setUpdatingId(id)
    try {
      await opsApi.updateSupportReport(id, status)
      const label = STATUS_LABEL[status] ?? status
      message.success(`Chamado ${id.slice(0, 8)} marcado como ${label}`)
      onQueueChange?.()
      await load(queueStatus)
      if (status === 'triaged' || status === 'resolved') {
        setLocalOpenCount((n) => Math.max(0, n - 1))
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Não foi possível atualizar o chamado')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="ops-panel-stack">
      <OpsKpiStrip
        openCount={localOpenCount}
        submitted24h={submitted24h}
        onOpenClick={() => {
          setQueueStatus('open')
          if (rows[0]) open({ kind: 'support_report', row: rows[0] })
        }}
      />

      <Alert
        type="warning"
        showIcon
        message="Dados sensíveis"
        description="Descrições livres podem conter PHI — não copiar para Slack. Bundle técnico só com consentimento."
        style={{ marginBottom: 8 }}
      />

      <OpsPanel
        title="Fila de suporte"
        description="Chamados «Reportar problema» — migration 061."
        extra={(
          <Space size={8}>
            <Segmented
              size="small"
              value={queueStatus}
              options={[
                { label: 'Abertos', value: 'open' },
                { label: 'Triados', value: 'triaged' },
                { label: 'Resolvidos', value: 'resolved' },
              ]}
              onChange={(v) => setQueueStatus(v as QueueStatus)}
            />
            <Button size="small" icon={<ReloadOutlined />} onClick={() => void load(queueStatus)} loading={loading}>
              Atualizar
            </Button>
          </Space>
        )}
      >
        <Table<SupportReportOpsRow>
          size="small"
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          dataSource={rows}
          locale={{ emptyText: `Nenhum chamado ${STATUS_LABEL[queueStatus]?.toLowerCase() ?? queueStatus}` }}
          onRow={(row) => ({
            className: 'ops-row-clickable',
            onClick: () => open({ kind: 'support_report', row }),
          })}
          expandable={{
            expandedRowRender: (row) => (
              <div style={{ maxWidth: 720 }}>
                {row.descriptionPreview && (
                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                    {row.descriptionPreview}
                  </Text>
                )}
                <Descriptions size="small" column={1} bordered>
                  <Descriptions.Item label="Conta">
                    <Text code>{row.accountId}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="App">
                    {row.appVersion ?? '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Expira">
                    {new Date(row.expiresAt).toLocaleString('pt-BR')}
                  </Descriptions.Item>
                </Descriptions>
                {row.consentTechnical && Object.keys(row.diagnosticContext).length > 0 && (
                  <pre style={{ marginTop: 12, fontSize: 11, maxHeight: 240, overflow: 'auto' }}>
                    {JSON.stringify(row.diagnosticContext, null, 2)}
                  </pre>
                )}
              </div>
            ),
          }}
          columns={[
            {
              title: 'ID',
              dataIndex: 'id',
              width: 100,
              render: (id: string) => <Text code>{id.slice(0, 8)}</Text>,
            },
            {
              title: 'Status',
              dataIndex: 'status',
              width: 88,
              render: (s: string) => <Tag>{STATUS_LABEL[s] ?? s}</Tag>,
            },
            {
              title: 'Categoria',
              dataIndex: 'category',
              width: 120,
              render: (c: string) => CATEGORY_LABEL[c] ?? c,
            },
            { title: 'Rota', dataIndex: 'route', ellipsis: true },
            {
              title: 'Consent.',
              key: 'consent',
              width: 100,
              render: (_: unknown, row: SupportReportOpsRow) => (
                <Space size={4}>
                  {row.consentTechnical && <Tag>tec</Tag>}
                  {row.consentProfileAccess && <Tag color="blue">perfil</Tag>}
                </Space>
              ),
            },
            {
              title: 'Quando',
              dataIndex: 'createdAt',
              width: 150,
              render: (d: string) => new Date(d).toLocaleString('pt-BR'),
            },
            {
              title: 'Ações',
              key: 'actions',
              width: 180,
              render: (_: unknown, row: SupportReportOpsRow) => (
                <Space size={4} onClick={(e) => e.stopPropagation()}>
                  {queueStatus === 'open' && (
                    <Button
                      size="small"
                      loading={updatingId === row.id}
                      onClick={() => void setStatus(row.id, 'triaged')}
                    >
                      Triar
                    </Button>
                  )}
                  {queueStatus !== 'resolved' && (
                    <Button
                      size="small"
                      type="primary"
                      loading={updatingId === row.id}
                      onClick={() => void setStatus(row.id, 'resolved')}
                    >
                      Resolver
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </OpsPanel>
    </div>
  )
}

function OpsKpiStrip({
  openCount,
  submitted24h,
  onOpenClick,
}: {
  openCount: number
  submitted24h: number
  onOpenClick?: () => void
}) {
  return (
    <OpsKpiGrid>
      <OpsKpiCard label="Abertos" value={openCount} alert={openCount > 0} onClick={onOpenClick} />
      <OpsKpiCard label="Submetidos (24h)" value={submitted24h} />
    </OpsKpiGrid>
  )
}
