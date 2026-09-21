import { Card, Button, Space, Tag, Typography, Alert, Popconfirm, message, Tabs } from 'antd'
import {
  PlayCircleOutlined,
  PoweroffOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { StackActionResult, StackLogFileTail, StackLogsSnapshot } from './ops.types.js'
import { opsApi } from './api.js'
import type { OpsDeploymentTier } from './theme/ops-environment.js'

const { Text } = Typography

function serviceTag(label: string, up: boolean, port: number) {
  return (
    <Tag color={up ? 'success' : 'error'}>
      {label} :{port} — {up ? 'no ar' : 'down'}
    </Tag>
  )
}

function basename(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] ?? filePath
}

function LogTailView({ tail, emptyHint }: { tail: StackLogFileTail; emptyHint?: string }) {
  const text =
    tail.missing
      ? emptyHint ?? '(arquivo ainda não existe neste ambiente)'
      : tail.error
        ? `(erro ao ler: ${tail.error})`
        : tail.lines.length
          ? tail.lines.join('\n')
          : '(arquivo vazio)'

  return (
    <div className="ops-stack-log-block">
      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
        {tail.file}
      </Text>
      <pre className="ops-stack-log-pre">{text}</pre>
    </div>
  )
}

export function StackControlCard({
  deploymentTier = 'integration',
  onStackChange,
  defaultLogsOpen = true,
}: {
  deploymentTier?: OpsDeploymentTier
  onStackChange?: () => void
  /** Infra: mostrar logs expandidos por padrão */
  defaultLogsOpen?: boolean
}) {
  const [status, setStatus] = useState<StackActionResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [logs, setLogs] = useState<StackLogsSnapshot | null>(null)
  const [logTab, setLogTab] = useState<string>('api')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  const refreshLogs = useCallback(async () => {
    try {
      const snapshot = await opsApi.stackLogs(80)
      setLogs(snapshot)
    } catch (err) {
      message.warning(err instanceof Error ? err.message : 'Falha ao carregar logs')
    }
  }, [])

  useEffect(() => {
    refresh()
    refreshLogs()
  }, [refresh, refreshLogs])

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (!acting) return
    pollRef.current = setInterval(() => {
      void refresh()
      void refreshLogs()
    }, 2000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [acting, refresh, refreshLogs])

  const run = async (action: 'start' | 'stop' | 'restart') => {
    setActing(action)
    void refreshLogs()
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
      void refreshLogs()
    }
  }

  const snap = status?.status
  const disabled = Boolean(status?.error) && status?.platform !== 'win32'
  const defaultApiPort = deploymentTier === 'preview' ? 3020 : 3010
  const defaultWebPort = deploymentTier === 'preview' ? 5174 : 5173
  const apiPortLabel = snap?.apiPort ?? defaultApiPort
  const webPortLabel = snap?.webPort ?? defaultWebPort
  const apiLogName = deploymentTier === 'preview' ? 'api-preview.log' : 'api.log'
  const webLogName = deploymentTier === 'preview' ? 'web-preview.log' : 'web.log'

  const logTabs = logs
    ? [
        {
          key: 'api',
          label: `API (${basename(logs.api.file)})`,
          children: (
            <LogTailView
              tail={logs.api}
              emptyHint={`Sem ${apiLogName} na raiz do monorepo — suba o stack via Start aqui ou scripts/up.ps1 (stdout da API).`}
            />
          ),
        },
        {
          key: 'web',
          label: `Web (${basename(logs.web.file)})`,
          children: (
            <LogTailView
              tail={logs.web}
              emptyHint={`Sem ${webLogName} — saída do Vite dev server (:${webPortLabel}).`}
            />
          ),
        },
        {
          key: 'ops',
          label: 'Stack ops',
          children: (
            <LogTailView
              tail={logs.ops}
              emptyHint="stack-ops.log — preenchido ao usar Start/Stop/Restart neste card."
            />
          ),
        },
        {
          key: 'mobile',
          label: 'Expo / Metro',
          children: (
            <LogTailView
              tail={logs.mobileExpo}
              emptyHint="packages/mobile/.expo-lan-log.txt — opcional; gere ao iniciar Expo com log redirecionado no worker."
            />
          ),
        },
      ]
    : []

  return (
    <Card
      size="small"
      title="Servidor Aiyra (API + Web)"
      loading={loading && !snap}
      extra={
        <Button size="small" icon={<ReloadOutlined />} onClick={() => { void refresh(); void refreshLogs() }} loading={loading}>
          Status
        </Button>
      }
    >
      {status?.error && status.platform !== 'win32' && (
        <Alert type="warning" showIcon message={status.error} style={{ marginBottom: 12 }} />
      )}

      {(acting || status?.operationInProgress || logs?.operationInProgress) && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message={
            acting
              ? `Operação «${acting}» em andamento — atualizando status e logs a cada 2s…`
              : 'Operação de stack em andamento em outra sessão'
          }
        />
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
          title={`Encerrar API (:${apiPortLabel}) e Web (:${webPortLabel})?`}
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

      <div className="ops-stack-logs-section" data-open={defaultLogsOpen ? '1' : '0'}>
        <Alert
          type="info"
          showIcon
          style={{ marginTop: 16, marginBottom: 12 }}
          message="O que aparece nos logs?"
          description={
            <ul className="ops-stack-log-legend">
              <li>
                <strong>API</strong> — processo Fastify (erros HTTP, sync, auth). Arquivo na raiz do repo:{' '}
                <Text code>{apiLogName}</Text>
              </li>
              <li>
                <strong>Web</strong> — Vite/React (build, proxy). Arquivo: <Text code>{webLogName}</Text>
              </li>
              <li>
                <strong>Stack ops</strong> — comandos Start/Stop/Restart deste painel: <Text code>stack-ops.log</Text>
              </li>
              <li>
                <strong>Expo / Metro</strong> — dev mobile (:8081), não é controlado por este card; log opcional em{' '}
                <Text code>packages/mobile/.expo-lan-log.txt</Text>
              </li>
              {logs?.monorepoRoot && (
                <li>
                  Lidos em: <Text code style={{ fontSize: 11 }}>{logs.monorepoRoot}</Text>
                </li>
              )}
            </ul>
          }
        />

        <div className="ops-stack-logs-toolbar">
          <Text strong>Tail dos arquivos (últimas linhas)</Text>
          <Button size="small" type="link" onClick={() => void refreshLogs()}>
            Atualizar logs
          </Button>
          {logs?.checkedAt && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {new Date(logs.checkedAt).toLocaleTimeString('pt-BR')}
            </Text>
          )}
        </div>

        {logs ? (
          <Tabs activeKey={logTab} onChange={setLogTab} size="small" items={logTabs} />
        ) : (
          <Text type="secondary">Carregando logs…</Text>
        )}
      </div>
    </Card>
  )
}
