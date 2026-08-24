import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  InfoCircleOutlined,
  MinusOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  Badge,
  Card,
  Empty,
  Input,
  List,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '../../lib/api.js'
import type { MarkerTrendGroup } from '../../lib/api.types.js'

const { Text, Title } = Typography

interface ExamMarkersDashboardProps {
  patientId: string
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'critical') return <Badge status="error" text={<Text type="danger" style={{ fontSize: 11 }}>Crítico</Text>} />
  if (status === 'altered') return <Badge status="warning" text={<Text type="warning" style={{ fontSize: 11 }}>Alterado</Text>} />
  return <Badge status="success" text={<Text type="secondary" style={{ fontSize: 11 }}>Normal</Text>} />
}

/** Seta de tendência comparando últimos dois valores numéricos. */
function TrendIcon({ group }: { group: MarkerTrendGroup }) {
  const nums = group.points.map((p) => p.numericValue).filter((v): v is number => v != null)
  if (nums.length < 2) return null
  const prev = nums[nums.length - 2]
  const last = nums[nums.length - 1]
  if (last > prev) return <ArrowUpOutlined style={{ color: '#cf1322', fontSize: 12 }} />
  if (last < prev) return <ArrowDownOutlined style={{ color: '#3f8600', fontSize: 12 }} />
  return <MinusOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />
}

export function ExamMarkersDashboard({ patientId }: ExamMarkersDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState<MarkerTrendGroup[]>([])
  const [search, setSearch] = useState('')
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    api.examMarkers
      .getTrends(patientId)
      .then((data) => {
        // Ordena: alterados/críticos primeiro, depois alfabético
        const statusOrder: Record<string, number> = { critical: 0, altered: 1, normal: 2 }
        data.sort((a, b) => {
          const sa = statusOrder[a.latestStatus] ?? 3
          const sb = statusOrder[b.latestStatus] ?? 3
          if (sa !== sb) return sa - sb
          return a.markerName.localeCompare(b.markerName)
        })
        setGroups(data)
        setSelectedMarker(data[0]?.markerName ?? null)
      })
      .catch(() => setGroups([]))
      .finally(() => setLoading(false))
  }, [patientId])

  const filteredGroups = useMemo(
    () =>
      groups.filter((g) => {
        const q = search.toLowerCase().trim()
        if (!q) return true
        return (
          g.markerName.toLowerCase().includes(q) ||
          (g.technicalName && g.technicalName.toLowerCase().includes(q))
        )
      }),
    [groups, search],
  )

  const activeGroup =
    filteredGroups.find((g) => g.markerName === selectedMarker) ?? filteredGroups[0] ?? null

  // Dados do gráfico com banda de referência
  const chartData = activeGroup?.points.filter((p) => p.numericValue != null) ?? []
  const hasRefBand = activeGroup?.refLow != null || activeGroup?.refHigh != null
  const yDomain = useMemo<[string | number, string | number]>(() => {
    const values = chartData.map((p) => p.numericValue as number)
    if (activeGroup?.refLow != null) values.push(activeGroup.refLow)
    if (activeGroup?.refHigh != null) values.push(activeGroup.refHigh)
    if (values.length === 0) return ['auto', 'auto']
    const min = Math.min(...values)
    const max = Math.max(...values)
    const pad = (max - min) * 0.15 || max * 0.1 || 1
    return [Math.max(0, min - pad), max + pad]
  }, [chartData, activeGroup])

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Spin size="large" tip="Carregando marcadores..." />
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <Card style={{ borderRadius: 16 }}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nenhum marcador numérico de exame registrado ainda." />
      </Card>
    )
  }

  const alteredCount = groups.filter((g) => g.latestStatus !== 'normal').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Cabeçalho com busca e resumo */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <Space size={8} align="center">
          <Title level={5} style={{ margin: 0 }}>Marcadores & Indicadores Médicos</Title>
          {alteredCount > 0 && (
            <Tag color="gold" style={{ marginInlineEnd: 0 }}>
              {alteredCount} fora da faixa
            </Tag>
          )}
        </Space>
        <Input
          placeholder="Buscar marcador..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 240, borderRadius: 8 }}
          allowClear
        />
      </div>

      {/* Layout master-detail: lista à esquerda + gráfico à direita na MESMA tela */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: 16, alignItems: 'start' }}>
        {/* ── Lista compacta ── */}
        <Card
          styles={{ body: { padding: 8 } }}
          style={{ borderRadius: 12 }}
        >
          <List
            size="small"
            dataSource={filteredGroups}
            style={{ maxHeight: 560, overflowY: 'auto' }}
            renderItem={(group) => {
              const selected = activeGroup?.markerName === group.markerName
              const refShort = group.refLow != null && group.refHigh != null
                ? `${group.refLow}–${group.refHigh}${group.unit ? ' ' + group.unit : ''}`
                : group.referenceRange
              return (
                <List.Item
                  onClick={() => setSelectedMarker(group.markerName)}
                  style={{
                    cursor: 'pointer',
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: selected ? '#e6f4ff' : undefined,
                    borderInlineStart: `3px solid ${selected ? '#1677ff' : 'transparent'}`,
                  }}
                >
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                      <Text strong={selected} style={{ fontSize: 13 }} ellipsis>
                        {group.markerName}
                      </Text>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <TrendIcon group={group} />
                        {group.technicalName && (
                          <Tooltip title={`Nome técnico: ${group.technicalName}`}>
                            <InfoCircleOutlined style={{ color: '#bfbfbf', fontSize: 11 }} />
                          </Tooltip>
                        )}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                      <Text style={{ fontSize: 15, fontWeight: 600, color: group.latestStatus === 'normal' ? '#1f1f1f' : '#d46b08' }}>
                        {group.latestValue}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 10 }}>
                        {new Date(group.latestCollectedAt).toLocaleDateString()}
                      </Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <StatusBadge status={group.latestStatus} />
                      {refShort && (
                        <Tooltip title={`Referência: ${group.referenceRange}`}>
                          <Text type="secondary" style={{ fontSize: 10 }} ellipsis>
                            Ref.: {refShort}
                          </Text>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </List.Item>
              )
            }}
          />
          {filteredGroups.length === 0 && (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nenhum marcador encontrado" style={{ padding: 24 }} />
          )}
        </Card>

        {/* ── Gráfico da evolução ── */}
        <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 20 } }}>
          {activeGroup ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
                <Space size={8} align="center">
                  <Title level={5} style={{ margin: 0 }}>{activeGroup.markerName}</Title>
                  {activeGroup.technicalName && (
                    <Tooltip title={`Nome técnico / TUSS: ${activeGroup.technicalName}`}>
                      <InfoCircleOutlined style={{ color: '#8c8c8c', fontSize: 14 }} />
                    </Tooltip>
                  )}
                  <StatusBadge status={activeGroup.latestStatus} />
                </Space>
                <Space size={12} align="center">
                  {activeGroup.referenceRange && (
                    <Tooltip title={activeGroup.referenceRange}>
                      <Tag color="purple" style={{ marginInlineEnd: 0 }}>
                        Ref.: {activeGroup.refLow != null && activeGroup.refHigh != null
                          ? `${activeGroup.refLow} – ${activeGroup.refHigh}`
                          : activeGroup.referenceRange}
                      </Tag>
                    </Tooltip>
                  )}
                  <Tag color="cyan">{activeGroup.unit || 'Valor'}</Tag>
                </Space>
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {chartData.length} mediç{chartData.length === 1 ? 'ão' : 'ões'} ·{' '}
                {chartData.length > 0 &&
                  `${new Date(chartData[0].collectedAt).toLocaleDateString()} → ${new Date(chartData[chartData.length - 1].collectedAt).toLocaleDateString()}`}
              </Text>

              {chartData.length === 0 ? (
                <Empty description="Sem valores numéricos para este marcador" style={{ padding: 40 }} />
              ) : (
                <div style={{ width: '100%', height: 420, marginTop: 12 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="collectedAt" style={{ fontSize: 11 }} />
                      <YAxis style={{ fontSize: 11 }} domain={yDomain} />
                      <RechartsTooltip
                        formatter={(val, _name, props) => [
                          `${val} ${props.payload.unit || ''}`,
                          activeGroup.markerName,
                        ]}
                        labelFormatter={(label) => `Coleta: ${label}`}
                      />
                      <Legend />
                      {/* Banda de referência */}
                      {hasRefBand && (
                        <ReferenceArea
                          y1={activeGroup.refLow ?? (activeGroup.refHigh as number) * 0}
                          y2={activeGroup.refHigh ?? (activeGroup.refLow as number) * 3 + 1}
                          fill="#52c41a"
                          fillOpacity={0.08}
                          stroke="#52c41a"
                          strokeOpacity={0.25}
                          strokeDasharray="4 4"
                          ifOverflow="extendDomain"
                        />
                      )}
                      {activeGroup.refLow != null && (
                        <ReferenceLine
                          y={activeGroup.refLow}
                          stroke="#52c41a"
                          strokeDasharray="4 4"
                          label={{ value: `mín ${activeGroup.refLow}`, position: 'insideBottomLeft', fontSize: 10, fill: '#389e0d' }}
                        />
                      )}
                      {activeGroup.refHigh != null && (
                        <ReferenceLine
                          y={activeGroup.refHigh}
                          stroke="#faad14"
                          strokeDasharray="4 4"
                          label={{ value: `máx ${activeGroup.refHigh}`, position: 'insideTopLeft', fontSize: 10, fill: '#d48806' }}
                        />
                      )}
                      <Line
                        type="monotone"
                        dataKey="numericValue"
                        name={activeGroup.markerName}
                        stroke="#1677ff"
                        strokeWidth={2.5}
                        dot={(props: { cx?: number; cy?: number; payload?: { status?: string } }) => {
                          const { cx, cy, payload } = props
                          const fill =
                            payload?.status === 'critical'
                              ? '#ff4d4f'
                              : payload?.status === 'altered'
                                ? '#faad14'
                                : '#1677ff'
                          return <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={5} fill={fill} stroke="#fff" strokeWidth={1.5} />
                        }}
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Histórico tabular compacto abaixo do gráfico */}
              <div style={{ marginTop: 12 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Últimas medições:
                </Text>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                  {[...activeGroup.points].reverse().slice(0, 8).map((p, i) => (
                    <Tag
                      key={`${p.examId}-${i}`}
                      color={
                        p.status === 'critical' ? 'red' : p.status === 'altered' ? 'gold' : 'green'
                      }
                      style={{ marginInlineEnd: 0 }}
                    >
                      {p.displayValue}
                      {p.unit ? ` ${p.unit}` : ''} · {new Date(p.collectedAt).toLocaleDateString()}
                    </Tag>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <Empty description="Selecione um marcador na lista para ver a evolução" />
          )}
        </Card>
      </div>
    </div>
  )
}
