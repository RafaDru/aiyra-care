import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Descriptions, Space, Table, Tag, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { SupportReportOpsRow } from './ops.types.js'
import { OpsPanel } from './components/OpsPanel.js'
import { opsApi } from './api.js'

const { Text } = Typography

const CATEGORY_LABEL: Record<string, string> = {
  technical_bug: 'Erro técnico',
  incorrect_data: 'Dado incorreto',
  ux_confusion: 'Confusão de UX',
  other: 'Outro',
}

export function SupportPanel({
  openCount,
  submitted24h,
}: {
  openCount: number
  submitted24h: number
}) {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<SupportReportOpsRow[]>([])
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await opsApi.supportReports('open')
      setRows(result.reports)
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const setStatus = async (id: string, status: 'triaged' | 'resolved') => {
    setUpdatingId(id)
    try {
      await opsApi.updateSupportReport(id, status)
      await load()
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="ops-panel-stack">
      <OpsKpiStrip openCount={openCount} submitted24h={submitted24h} />

      <Alert
        type="warning"
        showIcon
        message="Dados sensíveis"
        description="Descrições livres podem conter PHI — não copiar para Slack. Bundle técnico só com consentimento."
        style={{ marginBottom: 8 }}
      />

      <OpsPanel
        title="Fila aberta"
        description="Chamados «Reportar problema» — migration 061."
        extra={(
          <Button size="small" icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
            Atualizar
          </Button>
        )}
      >
        <Table<SupportReportOpsRow>
          size="small"
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          dataSource={rows}
          locale={{ emptyText: 'Nenhum chamado aberto' }}
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
                <Space size={4}>
                  <Button
                    size="small"
                    loading={updatingId === row.id}
                    onClick={() => void setStatus(row.id, 'triaged')}
                  >
                    Triar
                  </Button>
                  <Button
                    size="small"
                    type="primary"
                    loading={updatingId === row.id}
                    onClick={() => void setStatus(row.id, 'resolved')}
                  >
                    Resolver
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </OpsPanel>
    </div>
  )
}

function OpsKpiStrip({ openCount, submitted24h }: { openCount: number; submitted24h: number }) {
  return (
    <div className="ops-kpi-grid" style={{ marginBottom: 16 }}>
      <div className="ops-kpi-card">
        <Text type="secondary">Abertos</Text>
        <div className="ops-kpi-value">{openCount}</div>
      </div>
      <div className="ops-kpi-card">
        <Text type="secondary">Submetidos (24h)</Text>
        <div className="ops-kpi-value">{submitted24h}</div>
      </div>
    </div>
  )
}
