import { Card, Col, Descriptions, Empty, Row, Statistic, Table, Tag, Typography } from 'antd'
import type {
  OpsAlert,
  OpsFeatureCatalogEntry,
  OpsMetricsResponse,
  OpsMetricsSnapshot,
  RuntimeDegradedView,
  FeatureHealthRow,
} from './ops.types.js'
import { OpsSection } from './OpsSection.js'
import { resolveClientFeatureArea, resolveClientFeatureLabel } from './ops-feature-catalog.js'

const { Text, Paragraph } = Typography

const SEVERITY_COLOR: Record<OpsAlert['severity'], string> = {
  critical: 'error',
  warning: 'warning',
}

const HEALTH_SIGNAL: Record<FeatureHealthRow['signal'], { color: string; label: string }> = {
  hot: { color: 'error', label: 'Alto uso + falha' },
  errors_only: { color: 'warning', label: 'Só erros' },
  ok: { color: 'success', label: 'Ok' },
  low_signal: { color: 'default', label: 'Baixo sinal' },
}

function formatBrl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatUsdCents(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function ProbeStatus({
  label,
  ok,
  latencyMs,
  error,
}: {
  label: string
  ok: boolean
  latencyMs: number
  error?: string
}) {
  return (
    <Descriptions.Item label={label}>
      <Tag color={ok ? 'success' : 'error'}>
        {ok ? 'ok' : 'down'} ({latencyMs} ms)
      </Tag>
      {error && (
        <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
          {error}
        </Text>
      )}
    </Descriptions.Item>
  )
}

function AvaWindowCard({ title, window }: { title: string; window: OpsMetricsSnapshot['ava']['last24h'] }) {
  return (
    <Card size="small" title={title}>
      <Row gutter={16}>
        <Col span={12}>
          <Statistic title="Turnos" value={window.turns} />
        </Col>
        <Col span={12}>
          <Statistic title="Tokens (soma)" value={window.tokensTotalSum} />
        </Col>
        <Col span={12}>
          <Statistic title="p50 tokens" value={window.p50Tokens ?? '—'} />
        </Col>
        <Col span={12}>
          <Statistic title="p95 tokens" value={window.p95Tokens ?? '—'} />
        </Col>
      </Row>
      <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
        Janela {window.windowHours}h · in {window.tokensInSum} · out {window.tokensOutSum}
      </Paragraph>
    </Card>
  )
}

function FeatureCatalogMap({
  catalog,
  health,
}: {
  catalog: OpsFeatureCatalogEntry[]
  health: FeatureHealthRow[]
}) {
  const healthByKey = new Map(health.map((h) => [h.featureKey, h]))
  const byArea = new Map<string, OpsFeatureCatalogEntry[]>()
  for (const entry of catalog) {
    const list = byArea.get(entry.area) ?? []
    list.push(entry)
    byArea.set(entry.area, list)
  }

  return (
    <Card size="small" title="Mapa de features do app">
      <Row gutter={[16, 16]}>
        {Array.from(byArea.entries()).map(([area, entries]) => (
          <Col xs={24} md={12} key={area}>
            <Text strong>{area}</Text>
            <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
              {entries.map((e) => {
                const live = healthByKey.get(e.key)
                return (
                  <li key={e.key} style={{ marginBottom: 4 }}>
                    <Text>{e.label}</Text>
                    {e.routeExample && (
                      <Text type="secondary" style={{ fontSize: 12 }}> · {e.routeExample}</Text>
                    )}
                    {live && live.errorCount24h > 0 && (
                      <Tag color={live.signal === 'hot' ? 'error' : 'warning'} style={{ marginLeft: 8 }}>
                        {live.errorCount24h} err · {live.failRatePct}%
                      </Tag>
                    )}
                  </li>
                )
              })}
            </ul>
          </Col>
        ))}
      </Row>
    </Card>
  )
}

export function OpsMetricsDashboard({
  data,
  runtime,
}: {
  data: OpsMetricsResponse
  runtime?: RuntimeDegradedView
}) {
  const metrics = data.metrics
  const alerts = data.alerts
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Alertas critical"
              value={criticalCount}
              valueStyle={{ color: criticalCount ? '#cf1322' : undefined }}
            />
            <Text type="secondary">{alerts.length} total</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic title="Ava falhou (5 min)" value={metrics.productEvents.last5m.avaChatFailed} />
            <Text type="secondary">
              ok {metrics.productEvents.last5m.avaChatCompleted}
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic title="Quota bloqueada (1h)" value={metrics.productEvents.last1h.avaQuotaBlocked} />
            <Text type="secondary">
              Ava 1h: {metrics.productEvents.last1h.avaChatCompleted} ok /{' '}
              {metrics.productEvents.last1h.avaChatFailed} fail
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Sync stuck"
              value={metrics.sync.stuckJobs.length}
              valueStyle={{
                color: metrics.sync.stuckJobs.length ? '#cf1322' : undefined,
              }}
            />
            <Text type="secondary">jobs &gt; 30 min</Text>
          </Card>
        </Col>
      </Row>

      <Paragraph type="secondary" style={{ marginBottom: 0 }}>
        Snapshot: {metrics.generatedAt}
        {metrics.probe?.checkedAt && ` · probe ${metrics.probe.checkedAt}`}
      </Paragraph>

      <Card title="Alertas derivados" size="small">
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
                title: 'Pager',
                key: 'human',
                width: 72,
                render: (_: unknown, row: OpsAlert) => {
                  const t = data.triage?.find((x) => x.alertId === row.id)
                  return t?.humanRequired
                    ? <Tag color="error">humano</Tag>
                    : <Tag>auto</Tag>
                },
              },
              {
                title: 'Severidade',
                dataIndex: 'severity',
                width: 100,
                render: (s: OpsAlert['severity']) => <Tag color={SEVERITY_COLOR[s]}>{s}</Tag>,
              },
              { title: 'Categoria', dataIndex: 'category', width: 90 },
              { title: 'Mensagem', dataIndex: 'message' },
              {
                title: 'ID',
                dataIndex: 'id',
                width: 180,
                render: (id: string) => <Text code>{id}</Text>,
              },
            ]}
          />
        )}
      </Card>

      <OpsSection
        title="Infraestrutura"
        description="Sonda sintética, runtime degradado e dependências monitoradas."
      >
        {runtime && (
          <Card size="small" title="Runtime degradado (contingência)">
            <Descriptions size="small" column={2}>
              <Descriptions.Item label="Ava lite">
                <Tag color={runtime.avaLite ? 'warning' : 'default'}>
                  {runtime.avaLite ? runtime.avaLiteReason ?? 'on' : 'off'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Leitura degradada">
                <Tag color={runtime.degradedRead ? 'warning' : 'default'}>
                  {runtime.degradedRead
                    ? `${runtime.degradedReadAsOf ?? 'D-1'} (${runtime.degradedReadReason ?? ''})`
                    : 'off'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Sync pausado">
                {runtime.syncDegradedPortals.length
                  ? runtime.syncDegradedPortals.join(', ')
                  : '—'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        {metrics.probe && (
          <Card title="Sonda sintética" size="small">
            <Descriptions size="small" column={1} bordered>
              <ProbeStatus
                label="API Aiyra (monitorado)"
                ok={metrics.probe.api.ok}
                latencyMs={metrics.probe.api.latencyMs}
                error={metrics.probe.api.error}
              />
              <ProbeStatus
                label="Postgres"
                ok={metrics.probe.postgres.ok}
                latencyMs={metrics.probe.postgres.latencyMs}
                error={metrics.probe.postgres.error}
              />
              {metrics.probe.neo4j && (
                <ProbeStatus
                  label="Neo4j"
                  ok={metrics.probe.neo4j.ok}
                  latencyMs={metrics.probe.neo4j.latencyMs}
                  error={metrics.probe.neo4j.error}
                />
              )}
            </Descriptions>
          </Card>
        )}
      </OpsSection>

      <OpsSection
        title="Produto & UX"
        description="Uso do app (product_events) cruzado com erros de cliente — acesso vs taxa de falha em 24h."
      >
        <Card title="Saúde por feature (acesso × fail rate, 24h)" size="small">
          <Table<FeatureHealthRow>
            size="small"
            rowKey="featureKey"
            pagination={{ pageSize: 12 }}
            dataSource={metrics.featureHealth24h}
            locale={{ emptyText: 'Sem eventos nem erros na janela' }}
            columns={[
              {
                title: 'Feature',
                key: 'label',
                render: (_: unknown, row: FeatureHealthRow) => (
                  <span>
                    <Text strong>{row.label}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {row.area} · <Text code>{row.featureKey}</Text>
                    </Text>
                  </span>
                ),
              },
              {
                title: 'Sessões',
                dataIndex: 'usageSessions24h',
                width: 72,
              },
              {
                title: 'Eventos',
                dataIndex: 'usageEvents24h',
                width: 72,
              },
              {
                title: 'Erros',
                dataIndex: 'errorCount24h',
                width: 64,
                render: (n: number) => (
                  <Tag color={n > 0 ? 'warning' : 'default'}>{n}</Tag>
                ),
              },
              {
                title: 'Contas',
                dataIndex: 'accountCount24h',
                width: 64,
              },
              {
                title: 'Fail %',
                dataIndex: 'failRatePct',
                width: 72,
                render: (pct: number) => (
                  <Tag color={pct >= 25 ? 'error' : pct >= 10 ? 'warning' : 'default'}>
                    {pct}%
                  </Tag>
                ),
              },
              {
                title: 'Sinal',
                dataIndex: 'signal',
                width: 120,
                render: (signal: FeatureHealthRow['signal']) => {
                  const meta = HEALTH_SIGNAL[signal]
                  return <Tag color={meta.color}>{meta.label}</Tag>
                },
              },
            ]}
          />
        </Card>

        <FeatureCatalogMap
          catalog={metrics.featureCatalog}
          health={metrics.featureHealth24h}
        />

        <Card title="Erros cliente (UI/API, 24h)" size="small">
          <Table
            size="small"
            rowKey="fingerprint"
            pagination={{ pageSize: 8 }}
            dataSource={metrics.clientErrorFingerprints24h}
            locale={{ emptyText: 'Sem fingerprints' }}
            columns={[
              {
                title: 'Feature',
                dataIndex: 'feature',
                render: (f: string) => (
                  <span>
                    {resolveClientFeatureLabel(f)}
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {resolveClientFeatureArea(f)} · <Text code>{f}</Text>
                    </Text>
                  </span>
                ),
              },
              { title: 'Kind', dataIndex: 'errorKind', width: 90 },
              { title: 'Code', dataIndex: 'errorCode', width: 100 },
              { title: 'Count', dataIndex: 'count', width: 64 },
              { title: 'Contas', dataIndex: 'accountCount', width: 64 },
              {
                title: 'Último',
                dataIndex: 'lastSeenAt',
                width: 160,
                render: (d: string) => new Date(d).toLocaleString('pt-BR'),
              },
            ]}
          />
        </Card>

        <Card title="Eventos de erro (product_events, 24h)" size="small">
          <Table
            size="small"
            rowKey="fingerprint"
            pagination={{ pageSize: 8 }}
            dataSource={metrics.errorFingerprints24h}
            locale={{ emptyText: 'Sem fingerprints' }}
            columns={[
              { title: 'Evento', dataIndex: 'eventName' },
              { title: 'Count', dataIndex: 'count', width: 64 },
              {
                title: 'Último',
                dataIndex: 'lastSeenAt',
                width: 160,
                render: (d: string) => new Date(d).toLocaleString('pt-BR'),
              },
              {
                title: 'Fingerprint',
                dataIndex: 'fingerprint',
                render: (f: string) => <Text code>{f}</Text>,
              },
            ]}
          />
        </Card>
      </OpsSection>

      <OpsSection
        title="Sync & integrações"
        description="Jobs por portal, presos e falhas recentes."
      >
        <Card title="Portais (24h)" size="small">
          <Table
            size="small"
            rowKey="portalType"
            pagination={false}
            dataSource={metrics.sync.portalStats24h}
            locale={{ emptyText: 'Sem jobs na janela' }}
            columns={[
              { title: 'Portal', dataIndex: 'portalType' },
              { title: 'Total', dataIndex: 'total' },
              { title: 'OK', dataIndex: 'success' },
              {
                title: 'Falhas',
                dataIndex: 'failed',
                render: (n: number) => <Tag color={n > 0 ? 'warning' : 'default'}>{n}</Tag>,
              },
              {
                title: 'Fail %',
                dataIndex: 'failRatePct',
                render: (pct: number) => (
                  <Tag color={pct >= 50 ? 'error' : pct >= 20 ? 'warning' : 'default'}>
                    {pct}%
                  </Tag>
                ),
              },
            ]}
          />
        </Card>

        <Card title="Jobs presos (&gt; 30 min)" size="small">
          <Table
            size="small"
            rowKey="jobId"
            pagination={false}
            dataSource={metrics.sync.stuckJobs}
            locale={{ emptyText: 'Nenhum job preso' }}
            columns={[
              { title: 'Portal', dataIndex: 'portalType' },
              { title: 'Status', dataIndex: 'status' },
              { title: 'Minutos', dataIndex: 'minutesRunning' },
              {
                title: 'Job',
                dataIndex: 'jobId',
                render: (id: string) => <Text code>{id}</Text>,
              },
            ]}
          />
        </Card>

        <Card title="Falhas recentes" size="small">
          <Table
            size="small"
            rowKey="jobId"
            pagination={{ pageSize: 8 }}
            dataSource={metrics.sync.recentFailures}
            locale={{ emptyText: 'Sem falhas recentes' }}
            columns={[
              { title: 'Portal', dataIndex: 'portalType', width: 100 },
              {
                title: 'Erro',
                dataIndex: 'error',
                render: (e: string | null) => e ?? '—',
              },
              {
                title: 'Quando',
                dataIndex: 'finishedAt',
                width: 200,
                render: (d: string) => new Date(d).toLocaleString('pt-BR'),
              },
            ]}
          />
        </Card>
      </OpsSection>

      <OpsSection
        title="Ava & LLM"
        description="Turnos, tokens, mix de provedores e quota."
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <AvaWindowCard title="Tokens 24h" window={metrics.ava.last24h} />
          </Col>
          <Col xs={24} md={12}>
            <AvaWindowCard title="Tokens 7d" window={metrics.ava.last7d} />
          </Col>
        </Row>

        <Card title="Mix de provedores (24h)" size="small">
          <Table
            size="small"
            rowKey={(r) => `${r.provider}-${r.model}`}
            pagination={false}
            dataSource={metrics.ava.providerMix24h}
            locale={{ emptyText: 'Sem turnos Ava na janela' }}
            columns={[
              { title: 'Provider', dataIndex: 'provider' },
              { title: 'Model', dataIndex: 'model' },
              { title: 'Turnos', dataIndex: 'turns' },
              { title: 'Tokens', dataIndex: 'tokensTotal' },
            ]}
          />
        </Card>
      </OpsSection>

      {metrics.internalLlm && (
        <OpsSection
          title="Custo interno"
          description="Classificador, higiene de dados e orçamento LLM interno."
        >
          <Card size="small">
            <Row gutter={16}>
              <Col xs={12} sm={6}>
                <Statistic title="Chamadas" value={metrics.internalLlm.calls} />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic title="LLM ok" value={metrics.internalLlm.llmResolved} />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic title="Fallback local" value={metrics.internalLlm.localFallback} />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic title="Budget esgotado" value={metrics.internalLlm.budgetExhausted} />
              </Col>
            </Row>
            <Descriptions size="small" style={{ marginTop: 16 }} column={2}>
              <Descriptions.Item label="Gasto USD">
                {formatUsdCents(metrics.internalLlm.totalCostUsdCents)}
              </Descriptions.Item>
              <Descriptions.Item label="Orçamento mensal">
                {formatBrl(metrics.internalLlm.monthlyBudgetBrlCents)}
              </Descriptions.Item>
              <Descriptions.Item label="Gasto BRL">
                {formatBrl(metrics.internalLlm.spentBrlCents)}
              </Descriptions.Item>
              <Descriptions.Item label="Restante BRL">
                <Tag color={metrics.internalLlm.exhausted ? 'error' : 'success'}>
                  {formatBrl(metrics.internalLlm.remainingBrlCents)}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </OpsSection>
      )}
    </div>
  )
}
