import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Input,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd'
import { ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { api } from '../lib/api.js'
import type { OpsAlert, OpsMetricsResponse } from '../lib/ops.types.js'
import { PageHeader } from '../components/ui/PageHeader.js'
import { DismissibleHint } from '../components/ui/DismissibleHint.js'

const { Text, Paragraph } = Typography

const SEVERITY_COLOR: Record<OpsAlert['severity'], string> = {
  critical: 'error',
  warning: 'warning',
}

function OpsKeyField({ onSaved }: { onSaved: () => void }) {
  const [value, setValue] = useState(() => localStorage.getItem('opsMetricsKey') ?? '')
  return (
    <Space.Compact style={{ width: '100%', maxWidth: 480 }}>
      <Input.Password
        placeholder="x-internal-ops-key (OPS_METRICS_KEY)"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button
        onClick={() => {
          if (value.trim()) localStorage.setItem('opsMetricsKey', value.trim())
          else localStorage.removeItem('opsMetricsKey')
          onSaved()
        }}
      >
        Salvar
      </Button>
    </Space.Compact>
  )
}

export function OpsDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<OpsMetricsResponse | null>(null)
  const [dispatching, setDispatching] = useState(false)
  const [keyHint, setKeyHint] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setKeyHint(false)
    try {
      const result = await api.ops.metrics()
      setData(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar métricas'
      setError(msg)
      if (msg.includes('403') || msg.toLowerCase().includes('ops key')) setKeyHint(true)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const runDispatch = async () => {
    setDispatching(true)
    try {
      await api.ops.dispatchCheck()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no dispatch')
    } finally {
      setDispatching(false)
    }
  }

  const metrics = data?.metrics
  const alerts = data?.alerts ?? []
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <PageHeader
        title="Ops"
        subtitle="Alertas, sondas e fingerprints — sem PHI no canal externo."
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
              Atualizar
            </Button>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={runDispatch}
              loading={dispatching}
            >
              Verificar e acionar
            </Button>
          </Space>
        }
      />

      <DismissibleHint
        hintId="ops-dashboard-hint"
        title="Canal local"
        description="Em dev, use OPS_ALERT_WEBHOOK_URL=http://127.0.0.1:3012/ops-alert com o notificador local (toast + este painel)."
      />

      {keyHint && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Chave ops necessária"
          description={<OpsKeyField onSaved={load} />}
        />
      )}

      {error && !keyHint && (
        <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />
      )}

      {loading && !data ? (
        <Spin size="large" style={{ display: 'block', margin: '48px auto' }} />
      ) : !data ? (
        <Empty description="Sem dados" />
      ) : (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card size="small" title="Alertas ativos">
                <Space>
                  <Badge count={criticalCount} showZero color="red">
                    <Tag color={criticalCount ? 'error' : 'success'}>critical</Tag>
                  </Badge>
                  <Text type="secondary">{alerts.length} total</Text>
                </Space>
                <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                  Gerado: {metrics?.generatedAt}
                </Paragraph>
              </Card>
            </Col>
            <Col xs={24} md={16}>
              {metrics?.probe && (
                <Card size="small" title="Sonda (probe)">
                  <Descriptions size="small" column={2}>
                    <Descriptions.Item label="API">
                      <Tag color={metrics.probe.api.ok ? 'success' : 'error'}>
                        {metrics.probe.api.ok ? 'ok' : 'down'} ({metrics.probe.api.latencyMs} ms)
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Postgres">
                      <Tag color={metrics.probe.postgres.ok ? 'success' : 'error'}>
                        {metrics.probe.postgres.ok ? 'ok' : 'down'} ({metrics.probe.postgres.latencyMs} ms)
                      </Tag>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              )}
            </Col>
          </Row>

          <Card title="Alertas" size="small">
            {alerts.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nenhum alerta no momento" />
            ) : (
              <Table<OpsAlert>
                size="small"
                rowKey="id"
                pagination={false}
                dataSource={alerts}
                columns={[
                  {
                    title: 'Severidade',
                    dataIndex: 'severity',
                    render: (s: OpsAlert['severity']) => <Tag color={SEVERITY_COLOR[s]}>{s}</Tag>,
                  },
                  { title: 'Categoria', dataIndex: 'category' },
                  { title: 'Mensagem', dataIndex: 'message' },
                  { title: 'ID', dataIndex: 'id', render: (id: string) => <Text code>{id}</Text> },
                ]}
              />
            )}
          </Card>

          <Card title="Sync 24h (por portal)" size="small">
            <Table
              size="small"
              rowKey="portalType"
              pagination={false}
              dataSource={metrics?.sync.portalStats24h ?? []}
              columns={[
                { title: 'Portal', dataIndex: 'portalType' },
                { title: 'Total', dataIndex: 'total' },
                { title: 'Falhas', dataIndex: 'failed' },
                { title: 'Fail %', dataIndex: 'failRatePct' },
              ]}
            />
          </Card>

          <Card title="Erros cliente (24h, fingerprint)" size="small">
            <Table
              size="small"
              rowKey="fingerprint"
              pagination={{ pageSize: 8 }}
              dataSource={metrics?.clientErrorFingerprints24h ?? []}
              columns={[
                { title: 'Feature', dataIndex: 'feature' },
                { title: 'Kind', dataIndex: 'errorKind' },
                { title: 'Code', dataIndex: 'errorCode' },
                { title: 'Count', dataIndex: 'count' },
                { title: 'Contas', dataIndex: 'accountCount' },
                {
                  title: 'Fingerprint',
                  dataIndex: 'fingerprint',
                  render: (f: string) => <Text code>{f}</Text>,
                },
              ]}
            />
          </Card>
        </Space>
      )}
    </div>
  )
}
