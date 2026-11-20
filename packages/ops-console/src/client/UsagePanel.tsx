import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Segmented, Spin, Table, Tooltip, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { opsApi } from './api.js'
import type { OpsUsageHeatmapRow, OpsUsagePreset, OpsUsageResponse } from './ops.types.js'
import { OpsPanel } from './components/OpsPanel.js'
import { UsageLiveStrip } from './UsageLiveStrip.js'
import { AIYRACARE_TOKENS } from './theme/ops-theme.js'

const { Text } = Typography

const PRESET_OPTIONS: { label: string; value: OpsUsagePreset }[] = [
  { label: 'Hoje', value: 'today' },
  { label: '7 dias', value: '7d' },
  { label: '30 dias', value: '30d' },
]

function formatBucket(iso: string, preset: OpsUsagePreset): string {
  const d = new Date(iso)
  if (preset === '30d') {
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function heatColor(sessionCount: number, max: number): string {
  if (max <= 0 || sessionCount <= 0) return '#F1F5F9'
  const t = Math.min(1, sessionCount / max)
  const r = Math.round(241 - t * 100)
  const g = Math.round(245 - t * 40)
  const b = Math.round(249 - t * 120)
  return `rgb(${r},${g},${b})`
}

function UsageHeatmap({
  rows,
  preset,
}: {
  rows: OpsUsageHeatmapRow[]
  preset: OpsUsagePreset
}) {
  const { bucketLabels, maxSessions } = useMemo(() => {
    const labels = new Set<string>()
    let max = 0
    for (const row of rows) {
      for (const cell of row.cells) {
        labels.add(cell.bucketStart)
        max = Math.max(max, cell.sessionCount)
      }
    }
    const bucketLabels = [...labels].sort()
    return { bucketLabels, maxSessions: max }
  }, [rows])

  if (!rows.length) {
    return <Text type="secondary">Sem visualizações de tela no período.</Text>
  }

  return (
    <div className="ch-usage-heatmap">
      <motionHeader bucketLabels={bucketLabels} preset={preset} />
      {rows.map((row) => (
        <div key={row.area} className="ch-usage-heatmap-row">
          <div className="ch-usage-heatmap-row-label">{row.area}</div>
          <div className="ch-usage-heatmap-cells">
            {bucketLabels.map((bk) => {
              const cell = row.cells.find((c) => c.bucketStart === bk)
              const sessions = cell?.sessionCount ?? 0
              const fail = cell?.failRatePct
              const title = cell
                ? `${sessions} sessões · ${cell.eventCount} views${
                    fail != null ? ` · falha ${fail}%` : ''
                  }`
                : '—'
              return (
                <Tooltip key={bk} title={title}>
                  <div
                    className="ch-usage-heatmap-cell"
                    style={{
                      background: heatColor(sessions, maxSessions),
                      outline: fail != null && fail >= 15 ? '2px solid #EF4444' : undefined,
                    }}
                  />
                </Tooltip>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function motionHeader({
  bucketLabels,
  preset,
}: {
  bucketLabels: string[]
  preset: OpsUsagePreset
}) {
  if (bucketLabels.length > 24) {
    return (
      <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
        {bucketLabels.length} intervalos — passe o mouse nas células para detalhe.
      </Text>
    )
  }
  return (
    <div className="ch-usage-heatmap-row ch-usage-heatmap-row--head">
      <div className="ch-usage-heatmap-row-label" />
      <div className="ch-usage-heatmap-cells ch-usage-heatmap-cells--labels">
        {bucketLabels.map((bk) => (
          <span key={bk} className="ch-usage-heatmap-time-label">
            {formatBucket(bk, preset)}
          </span>
        ))}
      </div>
    </div>
  )
}

export function UsagePanel() {
  const [preset, setPreset] = useState<OpsUsagePreset>('today')
  const [data, setData] = useState<OpsUsageResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const payload = await opsApi.usage(preset)
      setData(payload)
    } catch {
      setError('Falha ao carregar uso — banco ou migração 090.')
    } finally {
      setLoading(false)
    }
  }, [preset])

  useEffect(() => {
    void load()
  }, [load])

  const chartData = useMemo(
    () =>
      (data?.series?.series ?? []).map((row) => ({
        ...row,
        label: formatBucket(row.bucketStart, preset),
      })),
    [data?.series?.series, preset],
  )

  const rankingRows = useMemo(() => {
    const map = new Map<string, { area: string; sessions: number; accounts: number; events: number }>()
    for (const row of data?.heatmap?.rows ?? []) {
      const agg = map.get(row.area) ?? { area: row.area, sessions: 0, accounts: 0, events: 0 }
      for (const cell of row.cells) {
        agg.sessions += cell.sessionCount
        agg.accounts += cell.accountCount
        agg.events += cell.eventCount
      }
      map.set(row.area, agg)
    }
    return [...map.values()].sort((a, b) => b.sessions - a.sessions)
  }, [data?.heatmap?.rows])

  const rankingColumns: ColumnsType<(typeof rankingRows)[0]> = [
    { title: 'Área', dataIndex: 'area', key: 'area' },
    { title: 'Sessões', dataIndex: 'sessions', width: 90 },
    { title: 'Contas', dataIndex: 'accounts', width: 90 },
    { title: 'Telas', dataIndex: 'events', width: 90 },
  ]

  return (
    <div className="ops-panel-stack">
      <UsageLiveStrip live={data?.live} />
      <OpsPanel
        title="Intervalo"
        description="Séries e mapa por área do app (America/Sao_Paulo no preset Hoje)."
      >
        <Segmented
          options={PRESET_OPTIONS}
          value={preset}
          onChange={(v) => setPreset(v as OpsUsagePreset)}
        />
        <Button type="link" onClick={() => void load()} style={{ marginLeft: 12 }}>
          Atualizar
        </Button>
      </OpsPanel>
      {loading && <Spin />}
      {error && <Text type="danger">{error}</Text>}
      {!loading && data?.series && (
        <>
          <OpsPanel title="Linha do tempo" description="Contas, sessões e telas no período.">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <RechartsTooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="activeAccounts"
                  name="Contas"
                  stroke={AIYRACARE_TOKENS.colorPrimary}
                  dot={false}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="activeSessions"
                  name="Sessões"
                  stroke={AIYRACARE_TOKENS.colorInfo}
                  dot={false}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="screenViews"
                  name="Telas"
                  stroke="#059669"
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="clientErrors"
                  name="Erros"
                  stroke={AIYRACARE_TOKENS.colorError}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </OpsPanel>
          <OpsPanel
            title="Mapa de calor por área"
            description="Intensidade = sessões em telas; contorno vermelho se fail rate ≥ 15%."
          >
            {data.heatmap && <UsageHeatmap rows={data.heatmap.rows} preset={preset} />}
          </OpsPanel>
          <OpsPanel title="Ranking por área">
            <Table
              size="small"
              pagination={false}
              rowKey="area"
              columns={rankingColumns}
              dataSource={rankingRows}
            />
          </OpsPanel>
        </>
      )}
    </div>
  )
}