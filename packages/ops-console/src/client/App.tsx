import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Spin } from 'antd'
import { ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons'
import type { OpsMetricsResponse } from './ops.types.js'
import { OpsMetricsDashboard } from './OpsMetricsDashboard.js'
import { OpsPanel } from './components/OpsPanel.js'
import { StackControlCard } from './StackControlCard.js'
import { opsApi } from './api.js'
import { countInfraIssues } from './ops-panels.js'
import type { OpsDeploymentTier } from './theme/ops-environment.js'
import { normalizeOpsDeploymentTier } from './theme/ops-environment.js'
import { isChLayoutMock } from './ch-navigation.js'
import { ChLayoutMockPage } from './mock/ChLayoutMockPage.js'

const AUTO_REFRESH_MS = 60_000

function AppConsole() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<OpsMetricsResponse | null>(null)
  const [dispatching, setDispatching] = useState(false)
  const [deploymentTier, setDeploymentTier] = useState<OpsDeploymentTier>('integration')

  const load = useCallback(async () => {
    setError(null)
    try {
      const [health, result] = await Promise.all([
        opsApi.health(),
        opsApi.metrics(),
      ])
      setDeploymentTier(normalizeOpsDeploymentTier(health.deploymentTier, health.port))
      setData(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar métricas'
      setError(msg)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const refresh = useCallback(async () => {
    setLoading(true)
    await load()
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

  const headerActions = (
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
  )

  const footerStatus = metrics
    ? [
        `Snapshot ${new Date(metrics.generatedAt).toLocaleString('pt-BR')}`,
        metrics.probe?.checkedAt
          ? `Probe ${new Date(metrics.probe.checkedAt).toLocaleString('pt-BR')}`
          : null,
        probeOk ? 'Dependências ok' : 'Degradado',
        `${data?.alerts.length ?? 0} alertas`,
        countInfraIssues(metrics) > 0 ? `${countInfraIssues(metrics)} infra down` : null,
        'Auto-refresh 60s',
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Carregando métricas…'

  if (loading && !data) {
    return (
      <div className="ch-layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <>
      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          style={{ margin: 16 }}
          closable
          onClose={() => setError(null)}
        />
      )}
      {!data ? null : (
        <OpsMetricsDashboard
          data={data}
          runtime={data.runtime}
          deploymentTier={deploymentTier}
          onRefresh={refresh}
          headerActions={headerActions}
          footerStatus={footerStatus}
          stackSlot={
            <OpsPanel
              title="Stack Aiyra"
              description={
                deploymentTier === 'preview'
                  ? 'API :3020 e web :5174 — app monitorado (staging local).'
                  : 'API :3010 e web :5173 — app monitorado (dev local).'
              }
            >
              <StackControlCard deploymentTier={deploymentTier} onStackChange={refresh} />
            </OpsPanel>
          }
        />
      )}
    </>
  )
}

export function App() {
  if (isChLayoutMock()) {
    return <ChLayoutMockPage />
  }
  return <AppConsole />
}
