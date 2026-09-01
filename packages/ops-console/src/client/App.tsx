import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Space, Spin, Typography } from 'antd'
import { ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons'
import type { OpsMetricsResponse } from './ops.types.js'
import { OpsMetricsDashboard } from './OpsMetricsDashboard.js'
import { OpsSection } from './OpsSection.js'
import { StackControlCard } from './StackControlCard.js'
import { opsApi } from './api.js'

const { Title, Paragraph } = Typography
const AUTO_REFRESH_MS = 60_000

export function App() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<OpsMetricsResponse | null>(null)
  const [dispatching, setDispatching] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const result = await opsApi.metrics()
      setData(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar métricas'
      setError(msg)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    await load()
  }, [load])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !loading && !dispatching) load()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [load, loading, dispatching])

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || loading || dispatching) return
      load()
    }, AUTO_REFRESH_MS)
    return () => window.clearInterval(id)
  }, [load, loading, dispatching])

  const runDispatch = async () => {
    setDispatching(true)
    try {
      await opsApi.dispatchCheck()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no dispatch')
    } finally {
      setDispatching(false)
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
      <Space direction="vertical" size="middle" style={{ width: '100%', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <Title level={3} style={{ marginBottom: 4 }}>Observabilidade</Title>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              Console independente do app Aiyra — lê Postgres direto e monitora a API como target.
              Atualiza cada 60s.
            </Paragraph>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={refresh} loading={loading}>
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
        </div>
        <Alert
          type="info"
          showIcon
          message="Processo separado"
          description="Este painel não depende do web (:5173) nem expõe rotas ops na API do produto. Alertas locais: OPS_ALERT_WEBHOOK_URL → notificador :3012."
        />
      </Space>

      <OpsSection
        title="Stack Aiyra (API + Web)"
        description="Controle local do app monitorado — target da sonda sintética."
      >
        <StackControlCard onStackChange={refresh} />
      </OpsSection>

      {error && (
        <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />
      )}

      {loading && !data ? (
        <Spin size="large" style={{ display: 'block', margin: '48px auto' }} />
      ) : !data ? null : (
        <OpsMetricsDashboard data={data} runtime={data.runtime} />
      )}
    </div>
  )
}
