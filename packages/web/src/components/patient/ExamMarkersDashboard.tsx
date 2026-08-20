import { useEffect, useState } from 'react'
import {
  InfoCircleOutlined,
  LineChartOutlined,
  SearchOutlined,
  TableOutlined,
} from '@ant-design/icons'
import {
  Card,
  Col,
  Empty,
  Input,
  Row,
  Segmented,
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

function getStatusTag(status: string) {
  if (status === 'critical') {
    return <Tag color="red">Crítico</Tag>
  }
  if (status === 'altered') {
    return <Tag color="gold">Alterado</Tag>
  }
  return <Tag color="green">Normal</Tag>
}

export function ExamMarkersDashboard({ patientId }: ExamMarkersDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState<MarkerTrendGroup[]>([])
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'cards' | 'charts'>('cards')
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    api.examMarkers
      .getTrends(patientId)
      .then((data) => {
        setGroups(data)
        if (data.length > 0) {
          setSelectedMarker(data[0].markerName)
        }
      })
      .catch(() => setGroups([]))
      .finally(() => setLoading(false))
  }, [patientId])

  const filteredGroups = groups.filter((g) => {
    const q = search.toLowerCase().trim()
    if (!q) return true
    return (
      g.markerName.toLowerCase().includes(q) ||
      (g.technicalName && g.technicalName.toLowerCase().includes(q))
    )
  })

  const activeChartGroup = groups.find((g) => g.markerName === selectedMarker) ?? filteredGroups[0]

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Spin size="large" tip="Carregando marcadores de exame..." />
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <Card style={{ borderRadius: 16 }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Nenhum marcador numérico de exame registrado ainda."
        />
      </Card>
    )
  }

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={5} style={{ margin: 0 }}>
            Marcadores de Exame & Indicadores Médicos
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Resultados mensuráveis de laudos laboratoriais agrupados por indicador com histórico.
          </Text>
        </div>

        <Space size={12} wrap>
          <Input
            placeholder="Buscar marcador ou código TUSS..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 260, borderRadius: 8 }}
            allowClear
          />
          <Segmented
            value={viewMode}
            onChange={(val) => setViewMode(val as 'cards' | 'charts')}
            options={[
              { value: 'cards', icon: <TableOutlined />, label: 'Cartões' },
              { value: 'charts', icon: <LineChartOutlined />, label: 'Gráficos' },
            ]}
          />
        </Space>
      </div>

      {viewMode === 'cards' ? (
        <Row gutter={[16, 16]}>
          {filteredGroups.map((group) => (
            <Col xs={24} sm={12} md={8} lg={6} key={group.markerName}>
              <Card
                hoverable
                style={{
                  borderRadius: 12,
                  height: '100%',
                  borderColor: selectedMarker === group.markerName ? '#1890ff' : undefined,
                }}
                styles={{ body: { padding: 16 } }}
                onClick={() => setSelectedMarker(group.markerName)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <Space size={4} align="center">
                    <Text strong style={{ fontSize: 14 }}>
                      {group.markerName}
                    </Text>
                    {group.technicalName && (
                      <Tooltip title={`Nome técnico / TUSS: ${group.technicalName}`}>
                        <InfoCircleOutlined style={{ color: '#8c8c8c', cursor: 'pointer', fontSize: 13 }} />
                      </Tooltip>
                    )}
                  </Space>
                  {getStatusTag(group.latestStatus)}
                </div>

                <div style={{ marginTop: 12, marginBottom: 8 }}>
                  <Text style={{ fontSize: 22, fontWeight: 700, color: '#1f1f1f' }}>
                    {group.latestValue}
                  </Text>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    Último: {group.latestCollectedAt}
                  </Text>
                  <Tag style={{ margin: 0, fontSize: 10 }}>{group.points.length} registro(s)</Tag>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 20 } }}>
          {activeChartGroup ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Space size={8} align="center">
                  <Title level={5} style={{ margin: 0 }}>
                    Evolução Histórica: {activeChartGroup.markerName}
                  </Title>
                  {activeChartGroup.technicalName && (
                    <Tooltip title={`Nome técnico: ${activeChartGroup.technicalName}`}>
                      <InfoCircleOutlined style={{ color: '#8c8c8c', fontSize: 14 }} />
                    </Tooltip>
                  )}
                </Space>
                <Tag color="cyan">{activeChartGroup.unit || 'Valor'}</Tag>
              </div>

              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activeChartGroup.points} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="collectedAt" style={{ fontSize: 11 }} />
                    <YAxis style={{ fontSize: 11 }} domain={['auto', 'auto']} />
                    <RechartsTooltip
                      formatter={(val, _name, props) => [
                        `${val} ${props.payload.unit || ''}`,
                        activeChartGroup.markerName,
                      ]}
                      labelFormatter={(label) => `Data da Coleta: ${label}`}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="numericValue"
                      name={activeChartGroup.markerName}
                      stroke="#1890ff"
                      strokeWidth={2.5}
                      dot={{ r: 5 }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <Empty description="Selecione um marcador para exibir o gráfico de tendência" />
          )}
        </Card>
      )}
    </Space>
  )
}
