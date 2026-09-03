import type { ReactNode } from 'react'
import {
  Col,
  Descriptions,
  Empty,
  Row,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd'
import type {
  OpsAlert,
  OpsFeatureCatalogEntry,
  OpsMetricsResponse,
  OpsMetricsSnapshot,
  RuntimeDegradedView,
  FeatureHealthRow,
} from './ops.types.js'
import { OpsPanel } from './components/OpsPanel.js'
import {
  AlertCategoryPie,
  AvaEventsTimeline,
  AvaPercentilesCompareChart,
  AvaTokensTimeline,
  BudgetUsageChart,
  ClientErrorsTimeline,
  FeatureFailRateChart,
  InternalLlmOutcomeChart,
  PortalFailRateChart,
  ProbeLatencyChart,
  ProviderMixChart,
  SyncJobsTimeline,
} from './components/OpsCharts.js'
import { OpsKpiCard, OpsKpiGrid } from './components/OpsKpiCard.js'
import { resolveClientFeatureArea, resolveClientFeatureLabel } from './ops-feature-catalog.js'
import { AIYRACARE_TOKENS } from './theme/ops-theme.js'

const { Text } = Typography

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

export function formatBrl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatUsdCents(cents: number): string {
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
    <OpsPanel title={title}>
      <Row gutter={16}>
        <Col span={12}><Statistic title="Turnos" value={window.turns} /></Col>
        <Col span={12}><Statistic title="Tokens (soma)" value={window.tokensTotalSum} /></Col>
        <Col span={12}><Statistic title="p50 tokens" value={window.p50Tokens ?? '—'} /></Col>
        <Col span={12}><Statistic title="p95 tokens" value={window.p95Tokens ?? '—'} /></Col>
      </Row>
      <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
        Janela {window.windowHours}h · in {window.tokensInSum} · out {window.tokensOutSum}
      </Text>
    </OpsPanel>
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
    <OpsPanel title="Mapa de features" description="Áreas do app com indicadores ao vivo (24h).">
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
    </OpsPanel>
  )
}

export function OverviewPanel({ data }: { data: OpsMetricsResponse }) {
  const metrics = data.metrics
  const alerts = data.alerts
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length

  return (
    <div className="ops-panel-stack">
      <OpsKpiGrid>
        <OpsKpiCard label="Alertas critical" value={criticalCount} hint={`${alerts.length} total`} alert={criticalCount > 0} />
        <OpsKpiCard
          label="Ava falhou (5 min)"
          value={metrics.productEvents.last5m.avaChatFailed}
          hint={`ok ${metrics.productEvents.last5m.avaChatCompleted}`}
          alert={metrics.productEvents.last5m.avaChatFailed > 0}
          sparkline={metrics.timeSeries24h.avaEvents.map((r) => r.failed)}
        />
        <OpsKpiCard
          label="Quota bloqueada (1h)"
          value={metrics.productEvents.last1h.avaQuotaBlocked}
          hint={`Ava 1h: ${metrics.productEvents.last1h.avaChatCompleted} ok / ${metrics.productEvents.last1h.avaChatFailed} fail`}
          sparkline={metrics.timeSeries24h.avaEvents.map((r) => r.quotaBlocked)}
        />
        <OpsKpiCard
          label="Sync stuck"
          value={metrics.sync.stuckJobs.length}
          hint="jobs > 30 min"
          alert={metrics.sync.stuckJobs.length > 0}
          sparkline={metrics.timeSeries24h.syncJobs.map((r) => r.failed)}
        />
      </OpsKpiGrid>

      <div className="ops-chart-grid">
        <div className="ops-chart-span-4">
          <AlertCategoryPie alerts={alerts} />
        </div>
        <div className="ops-chart-span-8">
          <ClientErrorsTimeline rows={metrics.timeSeries24h.clientErrors} />
        </div>
        <div className="ops-chart-span-6">
          <SyncJobsTimeline rows={metrics.timeSeries24h.syncJobs} />
        </div>
        <div className="ops-chart-span-6">
          <AvaEventsTimeline rows={metrics.timeSeries24h.avaEvents} />
        </div>
      </div>

      <OpsPanel title="Alertas derivados" description="Triagem pager: humano vs automático.">
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
                  return t?.humanRequired ? <Tag color="error">humano</Tag> : <Tag>auto</Tag>
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
                width: 160,
                render: (id: string) => <Text code>{id}</Text>,
              },
            ]}
          />
        )}
      </OpsPanel>
    </div>
  )
}

export function ProductPanel({ data }: { data: OpsMetricsResponse }) {
  const metrics = data.metrics

  return (
    <div className="ops-panel-stack">
      <div className="ops-chart-grid">
        <div className="ops-chart-span-6">
          <FeatureFailRateChart rows={metrics.featureHealth24h} />
        </div>
        <div className="ops-chart-span-6">
          <ClientErrorsTimeline rows={metrics.timeSeries24h.clientErrors} />
        </div>
      </div>

      <OpsPanel
        title="Saúde por feature"
        description="Cruzamento product_events × client_errors — acesso vs fail rate (24h)."
      >
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
            { title: 'Sessões', dataIndex: 'usageSessions24h', width: 72 },
            { title: 'Eventos', dataIndex: 'usageEvents24h', width: 72 },
            {
              title: 'Erros',
              dataIndex: 'errorCount24h',
              width: 64,
              render: (n: number) => <Tag color={n > 0 ? 'warning' : 'default'}>{n}</Tag>,
            },
            { title: 'Contas', dataIndex: 'accountCount24h', width: 64 },
            {
              title: 'Fail %',
              dataIndex: 'failRatePct',
              width: 72,
              render: (pct: number) => (
                <Tag color={pct >= 25 ? 'error' : pct >= 10 ? 'warning' : 'default'}>{pct}%</Tag>
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
      </OpsPanel>

      <FeatureCatalogMap catalog={metrics.featureCatalog} health={metrics.featureHealth24h} />

      <div className="ops-panel-split">
        <OpsPanel title="Erros cliente (UI/API)" description="Fingerprints agregados — últimas 24h.">
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
      </OpsPanel>

      <OpsPanel title="Eventos de erro (telemetria)" description="product_events com fingerprint de falha.">
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
      </OpsPanel>
      </div>
    </div>
  )
}

export function SyncPanel({ data }: { data: OpsMetricsResponse }) {
  const metrics = data.metrics

  return (
    <div className="ops-panel-stack">
      <div className="ops-chart-grid">
        <div className="ops-chart-span-8">
          <SyncJobsTimeline rows={metrics.timeSeries24h.syncJobs} />
        </div>
        <div className="ops-chart-span-4">
          <PortalFailRateChart rows={metrics.sync.portalStats24h} />
        </div>
      </div>

      <div className="ops-panel-split">
        <OpsPanel title="Portais (24h)" description="Jobs terminados por portal e taxa de falha.">
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
                <Tag color={pct >= 50 ? 'error' : pct >= 20 ? 'warning' : 'default'}>{pct}%</Tag>
              ),
            },
          ]}
        />
      </OpsPanel>

      <OpsPanel title="Jobs presos" description="Running/pending há mais de 30 minutos.">
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
            { title: 'Job', dataIndex: 'jobId', render: (id: string) => <Text code>{id}</Text> },
          ]}
        />
      </OpsPanel>
      </div>

      <OpsPanel title="Falhas recentes" description="Últimas 48h.">
        <Table
          size="small"
          rowKey="jobId"
          pagination={{ pageSize: 8 }}
          dataSource={metrics.sync.recentFailures}
          locale={{ emptyText: 'Sem falhas recentes' }}
          columns={[
            { title: 'Portal', dataIndex: 'portalType', width: 100 },
            { title: 'Erro', dataIndex: 'error', render: (e: string | null) => e ?? '—' },
            {
              title: 'Quando',
              dataIndex: 'finishedAt',
              width: 200,
              render: (d: string) => new Date(d).toLocaleString('pt-BR'),
            },
          ]}
        />
      </OpsPanel>
    </div>
  )
}

export function AvaPanel({ data }: { data: OpsMetricsResponse }) {
  const metrics = data.metrics

  return (
    <div className="ops-panel-stack">
      <OpsKpiGrid>
        <OpsKpiCard
          label="Turnos Ava (24h)"
          value={metrics.ava.last24h.turns}
          hint={`p95 ${metrics.ava.last24h.p95Tokens ?? '—'} tokens`}
        />
        <OpsKpiCard
          label="Tokens soma (24h)"
          value={metrics.ava.last24h.tokensTotalSum}
          hint={`in ${metrics.ava.last24h.tokensInSum} · out ${metrics.ava.last24h.tokensOutSum}`}
        />
        <OpsKpiCard
          label="Ava ok (1h)"
          value={metrics.productEvents.last1h.avaChatCompleted}
          hint={`fail ${metrics.productEvents.last1h.avaChatFailed}`}
        />
        <OpsKpiCard
          label="Quota bloqueada (1h)"
          value={metrics.productEvents.last1h.avaQuotaBlocked}
          alert={metrics.productEvents.last1h.avaQuotaBlocked > 0}
        />
      </OpsKpiGrid>

      <div className="ops-chart-grid">
        <div className="ops-chart-span-6">
          <AvaEventsTimeline rows={metrics.timeSeries24h.avaEvents} />
        </div>
        <div className="ops-chart-span-6">
          <AvaTokensTimeline rows={metrics.timeSeries24h.avaTokens} />
        </div>
        <div className="ops-chart-span-4">
          <ProviderMixChart rows={metrics.ava.providerMix24h} />
        </div>
        <div className="ops-chart-span-4">
          <AvaPercentilesCompareChart last24h={metrics.ava.last24h} last7d={metrics.ava.last7d} />
        </div>
        <div className="ops-chart-span-4">
          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <AvaWindowCard title="Tokens 24h" window={metrics.ava.last24h} />
            </Col>
            <Col xs={24}>
              <AvaWindowCard title="Tokens 7d" window={metrics.ava.last7d} />
            </Col>
          </Row>
        </div>
      </div>
    </div>
  )
}

export function InfraPanel({
  data,
  runtime,
  stackSlot,
}: {
  data: OpsMetricsResponse
  runtime?: RuntimeDegradedView
  stackSlot?: ReactNode
}) {
  const metrics = data.metrics
  const probe = metrics.probe

  return (
    <div className="ops-panel-stack">
      {stackSlot}

      <div className="ops-chart-grid">
        <div className="ops-chart-span-6">
          <ProbeLatencyChart probe={probe} />
        </div>
        <div className="ops-chart-span-6">
          {runtime && (
            <OpsPanel title="Runtime degradado" description="Contingência ativa no app monitorado.">
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
        </OpsPanel>
          )}
        </div>
      </div>

      {probe && (
        <OpsPanel title="Sonda sintética" description="Target monitorado — API Aiyra, Postgres, Neo4j.">
          <Descriptions size="small" column={1} bordered>
            <ProbeStatus
              label="API Aiyra"
              ok={probe.api.ok}
              latencyMs={probe.api.latencyMs}
              error={probe.api.error}
            />
            <ProbeStatus
              label="Postgres"
              ok={probe.postgres.ok}
              latencyMs={probe.postgres.latencyMs}
              error={probe.postgres.error}
            />
            {probe.neo4j && (
              <ProbeStatus
                label="Neo4j"
                ok={probe.neo4j.ok}
                latencyMs={probe.neo4j.latencyMs}
                error={probe.neo4j.error}
              />
            )}
          </Descriptions>
        </OpsPanel>
      )}
    </div>
  )
}

export function CostPanel({ data }: { data: OpsMetricsResponse }) {
  const internal = data.metrics.internalLlm
  if (!internal) {
    return (
      <Empty description="Indicadores de LLM interno não disponíveis neste ambiente." />
    )
  }

  return (
    <div className="ops-panel-stack">
      <OpsKpiGrid>
        <OpsKpiCard label="Chamadas" value={internal.calls} />
        <OpsKpiCard label="LLM ok" value={internal.llmResolved} />
        <OpsKpiCard label="Fallback local" value={internal.localFallback} />
        <OpsKpiCard
          label="Budget esgotado"
          value={internal.budgetExhausted}
          alert={internal.budgetExhausted > 0}
        />
      </OpsKpiGrid>

      <div className="ops-chart-grid">
        <div className="ops-chart-span-6">
          <BudgetUsageChart
            spentBrlCents={internal.spentBrlCents}
            remainingBrlCents={internal.remainingBrlCents}
            monthlyBudgetBrlCents={internal.monthlyBudgetBrlCents}
          />
        </div>
        <div className="ops-chart-span-6">
          <InternalLlmOutcomeChart
            llmResolved={internal.llmResolved}
            localFallback={internal.localFallback}
            budgetExhausted={internal.budgetExhausted}
          />
        </div>
      </div>

      <OpsPanel title="Detalhes do orçamento" description="Classificador e higiene — migration 043.">
        <Descriptions size="small" column={2}>
          <Descriptions.Item label="Gasto USD">
            {formatUsdCents(internal.totalCostUsdCents)}
          </Descriptions.Item>
          <Descriptions.Item label="Orçamento mensal">
            {formatBrl(internal.monthlyBudgetBrlCents)}
          </Descriptions.Item>
          <Descriptions.Item label="Gasto BRL">
            {formatBrl(internal.spentBrlCents)}
          </Descriptions.Item>
          <Descriptions.Item label="Restante BRL">
            <Tag color={internal.exhausted ? 'error' : 'success'}>
              {formatBrl(internal.remainingBrlCents)}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
        {internal.exhausted && (
          <Text type="danger" style={{ fontSize: 13, marginTop: 12, display: 'block' }}>
            Orçamento esgotado — classificação pode usar apenas regras locais.
          </Text>
        )}
      </OpsPanel>
    </div>
  )
}

export function countInfraIssues(metrics: OpsMetricsSnapshot): number {
  const probe = metrics.probe
  if (!probe) return 0
  let n = 0
  if (!probe.api.ok) n += 1
  if (!probe.postgres.ok) n += 1
  if (probe.neo4j && !probe.neo4j.ok) n += 1
  return n
}

export function countHotFeatures(metrics: OpsMetricsSnapshot): number {
  return metrics.featureHealth24h.filter((f) => f.signal === 'hot' || f.signal === 'errors_only').length
}

export { AIYRACARE_TOKENS }
