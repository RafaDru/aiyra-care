import { useEffect, useState } from 'react'
import { Card, Typography } from 'antd'
import { opsApi } from '../api.js'
import type { IncidentDefectCycleMetrics } from '../ops.types.js'

const { Text } = Typography

export function ChCycleMetricsCard() {
  const [metrics, setMetrics] = useState<IncidentDefectCycleMetrics | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void opsApi
      .incidentDefectCycleMetrics(7)
      .then(setMetrics)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Falha ao carregar métricas do ciclo')
      })
  }, [])

  if (error) {
    return (
      <Card size="small" title="Ciclo CH (7d)">
        <Text type="secondary">{error}</Text>
      </Card>
    )
  }

  if (!metrics) {
    return (
      <Card size="small" title="Ciclo CH (7d)" loading />
    )
  }

  const avg =
    metrics.defects.avgDaysToFixed != null
      ? `${metrics.defects.avgDaysToFixed}d (beta)`
      : '—'

  return (
    <Card size="small" title={`Ciclo CH (${metrics.windowDays}d)`}>
      <Text>
        abertos <Text strong>{metrics.incidents.open}</Text>
        {' · '}
        em correção <Text strong>{metrics.defects.inFix}</Text>
        {' · '}
        aguardando merge <Text strong>{metrics.defects.awaitingMerge}</Text>
        {' · '}
        resolvidos <Text strong>{metrics.incidents.resolvedInWindow}</Text>
        {' · '}
        tempo médio até fixed: <Text strong>{avg}</Text>
      </Text>
    </Card>
  )
}
