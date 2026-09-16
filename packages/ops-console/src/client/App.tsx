import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Spin, Tag } from 'antd'
import { ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons'
import type { OpsEnvTarget, OpsMetricsResponse } from './ops.types.js'
import { OpsMetricsDashboard } from './OpsMetricsDashboard.js'
import { OpsShell } from './components/OpsShell.js'
import { OpsPanel } from './components/OpsPanel.js'
import { StackControlCard } from './StackControlCard.js'
import {
  OpsEnvironmentSelector,
  readStoredEnvTarget,
  storeEnvTarget,
} from './components/OpsEnvironmentSelector.js'
import { opsApi } from './api.js'
import { countInfraIssues } from './ops-panels.js'
import type { OpsDeploymentTier } from './theme/ops-environment.js'
import { normalizeOpsDeploymentTier } from './theme/ops-environment.js'

const AUTO_REFRESH_MS = 60_000

const OPS_SUBTITLES: Record<OpsDeploymentTier, string> = {
  integration: 'Console AiyraCare · Postgres direto · dev :3010 / :5173',
  preview: 'Console AiyraCare · Postgres direto · staging :3020 / :5174',
  production: 'Console AiyraCare · Postgres direto · produção',
}

export function App() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<OpsMetricsResponse | null>(null)
  const [dispatching, setDispatching] = useState(false)
  const [deploymentTier, setDeploymentTier] = useState<OpsDeploymentTier>('integration')
  const [envTargets, setEnvTargets] = useState<OpsEnvTarget[]>([])
  const [envTargetId, setEnvTargetId] = useState('dev')

  useEffect(() => {
    opsApi.envTargets().then((res) => {
      setEnvTargets(res.targets)
      const stored = readStoredEnvTarget()
      const valid = res.targets.find((t) => t.id === stored && t.enabled)
      setEnvTargetId(valid?.id ?? res.defaultTargetId)
    }).catch(() => undefined)
  }, [])

  const onEnvTargetChange = (id: string) => {
    storeEnvTarget(id)
    setEnvTargetId(id)
    setLoading(true)
  }

  const load = useCallback(async () => {
    setError(null)
    try {
      const [health, result] = await Promise.all([
        opsApi.health(),
        opsApi.metrics(envTargetId),
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
  }, [envTargetId])

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
  const activeTarget = envTargets.find((t) => t.id === envTargetId)
  const metricsSource = data?.envTarget?.source === 'remote'
    ? `${activeTarget?.label ?? envTargetId} · ${activeTarget?.apiBase ?? ''}`
    : 'Postgres local (fallback)'

  return (
    <OpsShell
      title="Command Hub"
      subtitle={`${OPS_SUBTITLES[deploymentTier]} · métricas: ${metricsSource}`}
      deploymentTier={deploymentTier}
      envSelector={envTargets.length > 0 ? (
        <OpsEnvironmentSelector
          targets={envTargets}
          value={envTargetId}
          onChange={onEnvTargetChange}
        />
      ) : undefined}
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
            {activeTarget && (
              <Tag color={activeTarget.enabled ? 'blue' : 'default'}>
                Ops · {activeTarget.label}
                {activeTarget.port ? ` :${activeTarget.port}` : ''}
              </Tag>
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
          onRefresh={refresh}
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
