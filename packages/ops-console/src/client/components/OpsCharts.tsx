import type { ReactNode } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type {
  AvaProviderMixRow,
  AvaTokenPercentiles,
  OpsAlert,
  OpsHourlyAvaEventBucket,
  OpsHourlyAvaTokensBucket,
  OpsHourlyCountBucket,
  OpsHourlySyncBucket,
  OpsMetricsSnapshot,
  SyncPortalStatsRow,
  FeatureHealthRow,
} from '../ops.types.js'
import { AIYRACARE_TOKENS } from '../theme/ops-theme.js'
import {
  OPS_PROBE_API_SLOW_MS,
  OPS_PROBE_PG_SLOW_MS,
  probeLatencyTone,
} from '../theme/ops-thresholds.js'

const C = {
  primary: AIYRACARE_TOKENS.colorPrimary,
  info: AIYRACARE_TOKENS.colorInfo,
  success: AIYRACARE_TOKENS.colorSuccess,
  error: AIYRACARE_TOKENS.colorError,
  warning: '#F59E0B',
  slate: '#94A3B8',
  grid: '#E2E8F0',
}

const PIE_COLORS = [C.primary, C.info, C.success, C.warning, C.error, '#6366F1', '#14B8A6']

function ChartFrame({
  title,
  subtitle,
  height = 280,
  children,
}: {
  title: string
  subtitle?: string
  height?: number
  children: ReactNode
}) {
  return (
    <div className="ops-chart-frame">
      <div className="ops-chart-frame__head">
        <div className="ops-chart-frame__title">{title}</div>
        {subtitle && <div className="ops-chart-frame__subtitle">{subtitle}</div>}
      </div>
      <div className="ops-chart-frame__body" style={{ height }}>
        {children}
      </div>
    </div>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="ops-chart-empty">{message}</div>
  )
}

export function AlertCategoryPie({ alerts }: { alerts: OpsAlert[] }) {
  const data = [
    { name: 'Sync', value: alerts.filter((a) => a.category === 'sync').length },
    { name: 'LLM', value: alerts.filter((a) => a.category === 'llm').length },
    { name: 'Produto', value: alerts.filter((a) => a.category === 'product').length },
    { name: 'Infra', value: alerts.filter((a) => a.category === 'infra').length },
  ].filter((d) => d.value > 0)

  if (!data.length) {
    return (
      <ChartFrame title="Alertas por categoria" subtitle="Distribuição atual">
        <EmptyChart message="Sem alertas ativos" />
      </ChartFrame>
    )
  }

  return (
    <ChartFrame title="Alertas por categoria" subtitle="Distribuição atual">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={88} paddingAngle={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

export function ClientErrorsTimeline({ rows }: { rows: OpsHourlyCountBucket[] }) {
  if (!rows.length) {
    return (
      <ChartFrame title="Erros cliente" subtitle="Por hora · 24h">
        <EmptyChart message="Sem erros na janela" />
      </ChartFrame>
    )
  }

  return (
    <ChartFrame title="Erros cliente" subtitle="Por hora · 24h">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
          <Tooltip />
          <Area type="monotone" dataKey="count" name="Erros" stroke={C.error} fill={C.error} fillOpacity={0.2} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

export function SyncJobsTimeline({ rows }: { rows: OpsHourlySyncBucket[] }) {
  if (!rows.length) {
    return (
      <ChartFrame title="Jobs sync" subtitle="OK vs falha · 24h">
        <EmptyChart message="Sem jobs na janela" />
      </ChartFrame>
    )
  }

  return (
    <ChartFrame title="Jobs sync" subtitle="OK vs falha · 24h">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
          <Tooltip />
          <Legend />
          <Bar dataKey="success" name="OK" stackId="sync" fill={C.success} radius={[0, 0, 0, 0]} />
          <Bar dataKey="failed" name="Falha" stackId="sync" fill={C.error} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

export function PortalFailRateChart({ rows }: { rows: SyncPortalStatsRow[] }) {
  if (!rows.length) {
    return (
      <ChartFrame title="Fail rate por portal" subtitle="Últimas 24h">
        <EmptyChart message="Sem jobs" />
      </ChartFrame>
    )
  }

  const data = rows.map((r) => ({
    portal: r.portalType,
    failRate: r.failRatePct,
    failed: r.failed,
    total: r.total,
  }))

  return (
    <ChartFrame title="Fail rate por portal" subtitle="Últimas 24h">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
          <YAxis type="category" dataKey="portal" tick={{ fontSize: 11 }} width={100} />
          <Tooltip formatter={(v: number) => [`${v}%`, 'Fail rate']} />
          <Bar dataKey="failRate" name="Fail %" fill={C.warning} radius={[0, 4, 4, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.portal}
                fill={entry.failRate >= 50 ? C.error : entry.failRate >= 20 ? C.warning : C.success}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

export function FeatureFailRateChart({ rows }: { rows: FeatureHealthRow[] }) {
  const data = rows
    .filter((r) => r.errorCount24h > 0 || r.usageSessions24h > 0)
    .slice(0, 10)
    .map((r) => ({
      name: r.label,
      failRate: r.failRatePct,
      errors: r.errorCount24h,
    }))

  if (!data.length) {
    return (
      <ChartFrame title="Fail rate por feature" subtitle="Top áreas · 24h">
        <EmptyChart message="Sem dados de uso/erro" />
      </ChartFrame>
    )
  }

  return (
    <ChartFrame title="Fail rate por feature" subtitle="Top áreas · 24h" height={320}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
          <XAxis type="number" domain={[0, 'auto']} tick={{ fontSize: 11 }} unit="%" />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
          <Tooltip />
          <Bar dataKey="failRate" name="Fail %" fill={C.primary} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

export function AvaEventsTimeline({ rows }: { rows: OpsHourlyAvaEventBucket[] }) {
  if (!rows.length) {
    return (
      <ChartFrame title="Turnos Ava" subtitle="Completo vs falha · 24h">
        <EmptyChart message="Sem eventos Ava" />
      </ChartFrame>
    )
  }

  return (
    <ChartFrame title="Turnos Ava" subtitle="Completo vs falha · 24h">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey="completed" name="OK" stackId="ava" stroke={C.success} fill={C.success} fillOpacity={0.35} />
          <Area type="monotone" dataKey="failed" name="Falha" stackId="ava" stroke={C.error} fill={C.error} fillOpacity={0.4} />
          <Area type="monotone" dataKey="quotaBlocked" name="Quota" stackId="ava" stroke={C.warning} fill={C.warning} fillOpacity={0.35} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

export function AvaTokensTimeline({ rows }: { rows: OpsHourlyAvaTokensBucket[] }) {
  if (!rows.length) {
    return (
      <ChartFrame title="Tokens Ava" subtitle="Volume por hora · 24h">
        <EmptyChart message="Sem turnos LLM" />
      </ChartFrame>
    )
  }

  return (
    <ChartFrame title="Tokens Ava" subtitle="Volume por hora · 24h">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis yAxisId="tokens" tick={{ fontSize: 11 }} width={48} />
          <YAxis yAxisId="turns" orientation="right" tick={{ fontSize: 11 }} width={36} allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Line yAxisId="tokens" type="monotone" dataKey="tokens" name="Tokens" stroke={C.primary} strokeWidth={2} dot={false} />
          <Line yAxisId="turns" type="monotone" dataKey="turns" name="Turnos" stroke={C.info} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

export function ProviderMixChart({ rows }: { rows: AvaProviderMixRow[] }) {
  if (!rows.length) {
    return (
      <ChartFrame title="Mix de provedores" subtitle="Turnos · 24h">
        <EmptyChart message="Sem turnos" />
      </ChartFrame>
    )
  }

  const data = rows.map((r) => ({
    name: `${r.provider}/${r.model}`,
    turns: r.turns,
  }))

  return (
    <ChartFrame title="Mix de provedores" subtitle="Turnos · 24h">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="turns" nameKey="name" innerRadius={48} outerRadius={88} paddingAngle={1}>
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

const PROBE_FILL = {
  success: C.success,
  warning: C.warning,
  error: C.error,
} as const

export function ProbeLatencyChart({ probe }: { probe: OpsMetricsSnapshot['probe'] }) {
  if (!probe) {
    return (
      <ChartFrame title="Latência da sonda" subtitle="Última leitura">
        <EmptyChart message="Probe não disponível" />
      </ChartFrame>
    )
  }

  const data = [
    {
      name: 'API',
      ms: probe.api.latencyMs,
      ok: probe.api.ok,
      slowMs: OPS_PROBE_API_SLOW_MS,
      tone: probeLatencyTone(probe.api.ok, probe.api.latencyMs, OPS_PROBE_API_SLOW_MS),
    },
    {
      name: 'Postgres',
      ms: probe.postgres.latencyMs,
      ok: probe.postgres.ok,
      slowMs: OPS_PROBE_PG_SLOW_MS,
      tone: probeLatencyTone(probe.postgres.ok, probe.postgres.latencyMs, OPS_PROBE_PG_SLOW_MS),
    },
    ...(probe.neo4j
      ? [{
          name: 'Neo4j',
          ms: probe.neo4j.latencyMs,
          ok: probe.neo4j.ok,
          slowMs: OPS_PROBE_PG_SLOW_MS,
          tone: probeLatencyTone(probe.neo4j.ok, probe.neo4j.latencyMs, OPS_PROBE_PG_SLOW_MS),
        }]
      : []),
  ]

  return (
    <ChartFrame
      title="Latência da sonda"
      subtitle={`Última leitura · limiar API ${OPS_PROBE_API_SLOW_MS} ms · PG ${OPS_PROBE_PG_SLOW_MS} ms`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 11 }} width={40} />
          <Tooltip
            formatter={(v: number, _name, item) => {
              const row = item.payload as (typeof data)[number]
              return [`${v} ms (limiar ${row.slowMs} ms)`, 'Latência']
            }}
          />
          <Bar dataKey="ms" name="ms" radius={[6, 6, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={PROBE_FILL[entry.tone]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

export function AvaPercentilesCompareChart({
  last24h,
  last7d,
}: {
  last24h: AvaTokenPercentiles
  last7d: AvaTokenPercentiles
}) {
  const data = [
    { window: '24h', p50: last24h.p50Tokens ?? 0, p95: last24h.p95Tokens ?? 0, turns: last24h.turns },
    { window: '7d', p50: last7d.p50Tokens ?? 0, p95: last7d.p95Tokens ?? 0, turns: last7d.turns },
  ]

  if (!last24h.turns && !last7d.turns) {
    return (
      <ChartFrame title="Percentis Ava" subtitle="p50 / p95 tokens · 24h vs 7d">
        <EmptyChart message="Sem turnos na janela" />
      </ChartFrame>
    )
  }

  return (
    <ChartFrame title="Percentis Ava" subtitle="p50 / p95 tokens · 24h vs 7d">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
          <XAxis dataKey="window" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 11 }} width={48} />
          <Tooltip />
          <Legend />
          <Bar dataKey="p50" name="p50" fill={C.info} radius={[4, 4, 0, 0]} />
          <Bar dataKey="p95" name="p95" fill={C.primary} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

export function BudgetUsageChart({
  spentBrlCents,
  remainingBrlCents,
  monthlyBudgetBrlCents,
}: {
  spentBrlCents: number
  remainingBrlCents: number
  monthlyBudgetBrlCents: number
}) {
  const data = [
    { name: 'Gasto', value: spentBrlCents },
    { name: 'Restante', value: remainingBrlCents },
  ]

  return (
    <ChartFrame title="Orçamento interno" subtitle={`Teto ${(monthlyBudgetBrlCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 11 }} width={56} tickFormatter={(v) => `${(v / 100).toFixed(0)}`} />
          <Tooltip formatter={(v: number) => [(v / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), '']} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            <Cell fill={C.error} />
            <Cell fill={C.success} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

export function InternalLlmOutcomeChart({
  llmResolved,
  localFallback,
  budgetExhausted,
}: {
  llmResolved: number
  localFallback: number
  budgetExhausted: number
}) {
  const data = [
    { name: 'LLM ok', value: llmResolved },
    { name: 'Fallback', value: localFallback },
    { name: 'Budget', value: budgetExhausted },
  ].filter((d) => d.value > 0)

  if (!data.length) {
    return (
      <ChartFrame title="Desfechos LLM interno" subtitle="Classificador / higiene">
        <EmptyChart message="Sem chamadas" />
      </ChartFrame>
    )
  }

  return (
    <ChartFrame title="Desfechos LLM interno" subtitle="Classificador / higiene">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={88}>
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
