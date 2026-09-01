import { Card, Button, Space, Tag, Typography, Alert, Popconfirm, message } from 'antd'
import {
  PlayCircleOutlined,
  PoweroffOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { useCallback, useEffect, useState } from 'react'
import type { StackActionResult } from './ops.types.js'
import { opsApi } from './api.js'

const { Text, Paragraph } = Typography

function serviceTag(label: string, up: boolean, port: number) {
  return (
    <Tag color={up ? 'success' : 'error'}>
      {label} :{port} — {up ? 'no ar' : 'down'}
    </Tag>
  )
}

export function StackControlCard({
  onStackChange,
}: {
  onStackChange?: () => void
}) {
  const [status, setStatus] = useState<StackActionResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const result = await opsApi.stackStatus()
      setStatus(result)
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Falha ao ler status do stack')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const run = async (action: 'start' | 'stop' | 'restart') => {
    setActing(action)
    try {
      const result = await opsApi.stackAction(action)
      setStatus(result)
      if (result.message) {
        message.success(result.message)
      }
      if (result.error) {
        message.warning(result.error)
      }
      onStackChange?.()
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Falha na operação')
    } finally {
      setActing(null)
    }
  }

  const snap = status?.status
  const disabled = Boolean(status?.error) && status?.platform !== 'win32'

  return (
    <Card
      size="small"
      title="Servidor Aiyra (API + Web)"
      loading={loading && !snap}
      extra={
        <Button size="small" icon={<ReloadOutlined />} onClick={refresh} loading={loading}>
          Status
        </Button>
      }
    >
      {status?.error && status.platform !== 'win32' && (
        <Alert type="warning" showIcon message={status.error} style={{ marginBottom: 12 }} />
      )}

      {snap && (
        <Space wrap style={{ marginBottom: 12 }}>
          {serviceTag('API', snap.api.up, snap.apiPort)}
          {serviceTag('Web', snap.web.up, snap.webPort)}
          {snap.api.service && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {snap.api.service} / {snap.api.healthStatus ?? '—'}
            </Text>
          )}
        </Space>
      )}

      <Space wrap>
        <Button
          icon={<PlayCircleOutlined />}
          onClick={() => run('start')}
          loading={acting === 'start'}
          disabled={disabled}
        >
          Start
        </Button>
        <Popconfirm
          title="Encerrar API (:3010) e Web (:5173)?"
          description="O console ops e o notificador continuam rodando."
          onConfirm={() => run('stop')}
          okText="Encerrar"
          cancelText="Cancelar"
          disabled={disabled || acting !== null}
        >
          <Button
            icon={<PoweroffOutlined />}
            danger
            loading={acting === 'stop'}
            disabled={disabled}
          >
            Shutdown
          </Button>
        </Popconfirm>
        <Popconfirm
          title="Reiniciar API e Web?"
          onConfirm={() => run('restart')}
          okText="Reiniciar"
          cancelText="Cancelar"
          disabled={disabled || acting !== null}
        >
          <Button
            icon={<ReloadOutlined />}
            loading={acting === 'restart'}
            disabled={disabled}
          >
            Restart
          </Button>
        </Popconfirm>
      </Space>

      <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }}>
        Logs: <Text code>api.log</Text> · <Text code>web.log</Text> na raiz do monorepo.
      </Paragraph>
    </Card>
  )
}
