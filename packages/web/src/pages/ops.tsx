import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Empty,
  Input,
  Space,
  Spin,
} from 'antd'
import { ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { api } from '../lib/api.js'
import type { OpsMetricsResponse } from '../lib/ops.types.js'
import type { AccountFreshnessView } from '../lib/api.types.js'
import { PageHeader } from '../components/ui/PageHeader.js'
import { DismissibleHint } from '../components/ui/DismissibleHint.js'
import { OpsMetricsDashboard } from '../components/ops/OpsMetricsDashboard.js'

const AUTO_REFRESH_MS = 60_000

function OpsKeyField({ onSaved }: { onSaved: () => void }) {
  const [value, setValue] = useState(() => localStorage.getItem('opsMetricsKey') ?? '')
  return (
    <Space.Compact style={{ width: '100%', maxWidth: 480 }}>
      <Input.Password
        placeholder="x-internal-ops-key (OPS_METRICS_KEY)"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button
        onClick={() => {
          if (value.trim()) localStorage.setItem('opsMetricsKey', value.trim())
          else localStorage.removeItem('opsMetricsKey')
          onSaved()
        }}
      >
        Salvar
      </Button>
    </Space.Compact>
  )
}

export function OpsDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<OpsMetricsResponse | null>(null)
  const [runtime, setRuntime] = useState<AccountFreshnessView['runtime'] | undefined>()
  const [dispatching, setDispatching] = useState(false)
  const [keyHint, setKeyHint] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    setKeyHint(false)
    try {
      const result = await api.ops.metrics()
      setData(result)
      try {
        const freshness = await api.account.freshness()
        setRuntime(freshness.runtime)
      } catch {
        setRuntime(undefined)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar métricas'
      setError(msg)
      if (msg.includes('403') || msg.toLowerCase().includes('ops key')) setKeyHint(true)
      if (msg.includes('Sem conexão') || msg.includes('indisponível')) {
        setError(`${msg} — confira se a API está em :3010 (scripts/up.ps1).`)
      }
      setData(null)
      setRuntime(undefined)
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
    const id = window.setInterval(() => {
      if (!loading && !dispatching) load()
    }, AUTO_REFRESH_MS)
    return () => window.clearInterval(id)
  }, [load, loading, dispatching])

  const runDispatch = async () => {
    setDispatching(true)
    try {
      await api.ops.dispatchCheck()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no dispatch')
    } finally {
      setDispatching(false)
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
      <PageHeader
        title="Observabilidade"
        subtitle="Indicadores ops: Ava, sync, LLM, erros e infra — atualiza cada 60s."
        extra={
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
        }
      />

      <DismissibleHint
        hintId="ops-dashboard-hint"
        title="Canal local"
        description="Alertas críticos disparam o notificador na bandeja (OPS_ALERT_WEBHOOK_URL → :3012)."
      />

      {keyHint && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Chave ops necessária"
          description={<OpsKeyField onSaved={refresh} />}
        />
      )}

      {error && !keyHint && (
        <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />
      )}

      {loading && !data ? (
        <Spin size="large" style={{ display: 'block', margin: '48px auto' }} />
      ) : !data ? (
        <Empty description="Sem dados" />
      ) : (
        <OpsMetricsDashboard data={data} runtime={runtime} />
      )}
    </div>
  )
}
