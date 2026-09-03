import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Space, Spin, Tag } from 'antd'
import { ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons'
import type { OpsMetricsResponse } from './ops.types.js'
import { OpsMetricsDashboard } from './OpsMetricsDashboard.js'
import { OpsShell } from './components/OpsShell.js'
import { OpsPanel } from './components/OpsPanel.js'
import { StackControlCard } from './StackControlCard.js'
import { opsApi } from './api.js'
import { countInfraIssues } from './ops-panels.js'

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

  const metrics = data?.metrics
  const probeOk = metrics?.probe?.api.ok && metrics?.probe?.postgres.ok

  return (
    <OpsShell
      title="Observabilidade"
      subtitle="Console AiyraCare · Postgres direto · target API :3010"
      actions={
        <>
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
        </>
      }
      statusStrip={
        metrics ? (
          <>
            <span className="ops-status-pill">
              Snapshot {new Date(metrics.generatedAt).toLocaleString('pt-BR')}
            </span>
            {metrics.probe?.checkedAt && (
              <span className="ops-status-pill">
                Probe {new Date(metrics.probe.checkedAt).toLocaleString('pt-BR')}
              </span>
            )}
            <Tag color={probeOk ? 'success' : 'error'}>
              {probeOk ? 'Dependências ok' : 'Degradado'}
            </Tag>
            <Tag>{data?.alerts.length ?? 0} alertas</Tag>
            {countInfraIssues(metrics) > 0 && (
              <Tag color="error">{countInfraIssues(metrics)} infra down</Tag>
            )}
            <span style={{ color: '#64748b' }}>Auto-refresh 60s</span>
          </>
        ) : null
      }
    >
      {error && (
        <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />
      )}

      {loading && !data ? (
        <Spin size="large" style={{ display: 'block', margin: '48px auto' }} />
      ) : !data ? null : (
        <OpsMetricsDashboard
          data={data}
          runtime={data.runtime}
          stackSlot={
            <OpsPanel title="Stack Aiyra" description="API :3010 e web :5173 — app monitorado.">
              <StackControlCard onStackChange={refresh} />
            </OpsPanel>
          }
        />
      )}
    </OpsShell>
  )
}
