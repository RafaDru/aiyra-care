import { useEffect, useState } from 'react'
import { Space, Spin, Tag, Typography } from 'antd'
import { api } from '../../lib/api.js'
import type { ExamMarker } from '../../lib/api.types.js'

const { Text } = Typography

function getStatusTag(status: string) {
  if (status === 'critical') return <Tag color="red">Crítico</Tag>
  if (status === 'altered') return <Tag color="gold">Alterado</Tag>
  return <Tag color="green">Normal</Tag>
}

export function InlineExamMarkersList({ examId }: { examId: string }) {
  const [loading, setLoading] = useState(true)
  const [markers, setMarkers] = useState<ExamMarker[]>([])

  useEffect(() => {
    setLoading(true)
    api.examMarkers
      .listByExam(examId)
      .then(setMarkers)
      .catch(() => setMarkers([]))
      .finally(() => setLoading(false))
  }, [examId])

  if (loading) {
    return <Spin size="small" style={{ padding: '4px 0' }} />
  }

  if (markers.length === 0) {
    return null
  }

  return (
    <div
      style={{
        marginTop: 8,
        padding: '8px 12px',
        background: '#f8fafc',
        borderRadius: 8,
        border: '1px solid #f1f5f9',
      }}
    >
      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6, fontWeight: 600 }}>
        MARCADORES MEDIDOS NESTE LAUDO:
      </Text>
      <Space size={[8, 8]} wrap>
        {markers.map((m) => (
          <div
            key={m.id}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#ffffff',
              padding: '2px 8px',
              borderRadius: 6,
              border: '1px solid #e2e8f0',
              fontSize: 12,
            }}
          >
            <Text strong style={{ fontSize: 12 }}>
              {m.markerName}:
            </Text>
            <Text style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>
              {m.displayValue} {m.unit || ''}
            </Text>
            {getStatusTag(m.status)}
          </div>
        ))}
      </Space>
    </div>
  )
}
