import { useEffect, useState } from 'react'
import { Alert, Card, Spin, Typography } from 'antd'
import { api } from '../../lib/api.js'
import type { PatientContext } from '../../lib/api.types.js'
import { PatientContextTimeline } from './PatientContextTimeline.js'

const { Paragraph, Text } = Typography

interface PatientContextPanelProps {
  patientId: string
}

export function PatientContextPanel({ patientId }: PatientContextPanelProps) {
  const [context, setContext] = useState<PatientContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    api.patients
      .context(patientId)
      .then(setContext)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar contexto'))
      .finally(() => setLoading(false))
  }, [patientId])

  if (loading) return <Spin style={{ display: 'block', margin: '16px auto' }} />
  if (error) return <Alert type="error" message={error} showIcon />
  if (!context) return null

  return (
    <Card title="Resumo clínico" size="small" style={{ marginBottom: 16 }}>
      <Paragraph style={{ marginBottom: 16 }}>{context.textSummary}</Paragraph>

      {context.alerts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Text strong>Alertas</Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {context.alerts.map((alert, i) => (
              <Alert
                key={`${alert.kind}-${i}`}
                type={alert.severity === 'critical' ? 'error' : alert.severity === 'warning' ? 'warning' : 'info'}
                message={alert.title}
                description={alert.detail}
                showIcon
              />
            ))}
          </div>
        </div>
      )}

      {context.timeline.length > 0 && (
        <PatientContextTimeline events={context.timeline} maxItems={8} />
      )}
    </Card>
  )
}
