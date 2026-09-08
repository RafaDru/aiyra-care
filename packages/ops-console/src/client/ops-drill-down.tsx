import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { Descriptions, Empty, Modal, Table, Tag, Typography } from 'antd'
import type {
  ClientErrorFingerprintRow,
  ErrorFingerprintRow,
  FeatureHealthRow,
  OpsAlert,
  OpsAlertTriageRow,
  OpsMetricsResponse,
  SupportReportOpsRow,
  SyncRecentFailureRow,
  SyncStuckJobRow,
} from './ops.types.js'
import { formatBrl, formatUsdCents } from './ops-format.js'
import { resolveClientFeatureArea, resolveClientFeatureLabel } from './ops-feature-catalog.js'

const { Text, Paragraph } = Typography

export type OpsDrillDown =
  | { kind: 'alerts'; title: string; filter?: { severity?: OpsAlert['severity']; category?: OpsAlert['category'] } }
  | { kind: 'alert'; alert: OpsAlert; triage?: OpsAlertTriageRow }
  | { kind: 'sync_stuck' }
  | { kind: 'sync_portal'; portalType: string }
  | { kind: 'sync_hour'; label: string; success: number; failed: number }
  | { kind: 'ava_events'; label: string; completed: number; failed: number; quotaBlocked: number }
  | { kind: 'ava_tokens'; label: string; turns: number; tokens: number }
  | { kind: 'ava_window'; window: '24h' | '7d' }
  | { kind: 'ava_provider'; provider: string; model: string; turns: number; tokensTotal: number }
  | { kind: 'client_errors_hour'; label: string; count: number }
  | { kind: 'feature'; row: FeatureHealthRow }
  | { kind: 'client_error_fp'; row: ClientErrorFingerprintRow }
  | { kind: 'error_fp'; row: ErrorFingerprintRow }
  | { kind: 'probe'; target: 'api' | 'postgres' | 'neo4j' }
  | { kind: 'runtime' }
  | { kind: 'internal_llm'; outcome?: 'llm' | 'fallback' | 'budget' }
  | { kind: 'budget' }
  | { kind: 'support_report'; row: SupportReportOpsRow }

interface OpsDrillDownContextValue {
  open: (drill: OpsDrillDown) => void
  close: () => void
}

const OpsDrillDownContext = createContext<OpsDrillDownContextValue | null>(null)

export function useOpsDrillDown(): OpsDrillDownContextValue {
  const ctx = useContext(OpsDrillDownContext)
  if (!ctx) throw new Error('useOpsDrillDown must be used within OpsDrillDownProvider')
  return ctx
}

const SEVERITY_COLOR: Record<OpsAlert['severity'], string> = {
  critical: 'error',
  warning: 'warning',
}

const CATEGORY_LABEL: Record<string, string> = {
  technical_bug: 'Erro técnico',
  incorrect_data: 'Dado incorreto',
  ux_confusion: 'Confusão de UX',
  other: 'Outro',
}

function JsonBlock({ value }: { value: unknown }) {
  if (value == null) return <Text type="secondary">—</Text>
  return (
    <pre className="ops-drill-json">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

function DrillAlertDetail({
  alert,
  triage,
}: {
  alert: OpsAlert
  triage?: OpsAlertTriageRow
}) {
  return (
    <>
      <Descriptions size="small" column={1} bordered>
        <Descriptions.Item label="Severidade">
          <Tag color={SEVERITY_COLOR[alert.severity]}>{alert.severity}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Categoria">{alert.category}</Descriptions.Item>
        <Descriptions.Item label="Mensagem">{alert.message}</Descriptions.Item>
        <Descriptions.Item label="ID"><Text code>{alert.id}</Text></Descriptions.Item>
        {triage && (
          <>
            <Descriptions.Item label="Pager">
              {triage.humanRequired ? <Tag color="error">humano</Tag> : <Tag>automático</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Tier">{triage.tier}</Descriptions.Item>
            <Descriptions.Item label="Motivo triagem">{triage.reason}</Descriptions.Item>
          </>
        )}
      </Descriptions>
      {alert.details && Object.keys(alert.details).length > 0 && (
        <>
          <Paragraph strong style={{ marginTop: 16, marginBottom: 8 }}>Detalhes técnicos</Paragraph>
          <JsonBlock value={alert.details} />
        </>
      )}
    </>
  )
}

function DrillAlertsList({
  alerts,
  triage,
  filter,
}: {
  alerts: OpsAlert[]
  triage?: OpsAlertTriageRow[]
  filter?: { severity?: OpsAlert['severity']; category?: OpsAlert['category'] }
}) {
  let rows = alerts
  if (filter?.severity) rows = rows.filter((a) => a.severity === filter.severity)
  if (filter?.category) rows = rows.filter((a) => a.category === filter.category)

  if (!rows.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nenhum alerta neste filtro" />
  }

  return (
    <Table<OpsAlert>
      size="small"
      rowKey="id"
      pagination={rows.length > 8 ? { pageSize: 8 } : false}
      dataSource={rows}
      columns={[
        {
          title: 'Pager',
          width: 72,
          render: (_: unknown, row: OpsAlert) => {
            const t = triage?.find((x) => x.alertId === row.id)
            return t?.humanRequired ? <Tag color="error">humano</Tag> : <Tag>auto</Tag>
          },
        },
        {
          title: 'Sev.',
          dataIndex: 'severity',
          width: 88,
          render: (s: OpsAlert['severity']) => <Tag color={SEVERITY_COLOR[s]}>{s}</Tag>,
        },
        { title: 'Cat.', dataIndex: 'category', width: 72 },
        { title: 'Mensagem', dataIndex: 'message', ellipsis: true },
      ]}
      expandable={{
        expandedRowRender: (row) => {
          const t = triage?.find((x) => x.alertId === row.id)
          return <DrillAlertDetail alert={row} triage={t} />
        },
      }}
    />
  )
}

function modalTitle(drill: OpsDrillDown): string {
  switch (drill.kind) {
    case 'alerts': return drill.title
    case 'alert': return `Alerta · ${drill.alert.id}`
    case 'sync_stuck': return 'Jobs sync presos'
    case 'sync_portal': return `Portal · ${drill.portalType}`
    case 'sync_hour': return `Sync · ${drill.label}`
    case 'ava_events': return `Ava · ${drill.label}`
    case 'ava_tokens': return `Tokens Ava · ${drill.label}`
    case 'ava_window': return `Janela Ava · ${drill.window}`
    case 'ava_provider': return `Provedor · ${drill.provider}/${drill.model}`
    case 'client_errors_hour': return `Erros cliente · ${drill.label}`
    case 'feature': return `Feature · ${drill.row.label}`
    case 'client_error_fp': return 'Fingerprint erro cliente'
    case 'error_fp': return 'Fingerprint telemetria'
    case 'probe': return `Sonda · ${drill.target}`
    case 'runtime': return 'Runtime degradado'
    case 'internal_llm': return 'LLM interno'
    case 'budget': return 'Orçamento interno'
    case 'support_report': return `Suporte · ${drill.row.id.slice(0, 8)}`
    default: return 'Detalhe'
  }
}

function DrillContent({ drill, data }: { drill: OpsDrillDown; data: OpsMetricsResponse }) {
  const metrics = data.metrics

  switch (drill.kind) {
    case 'alerts':
      return <DrillAlertsList alerts={data.alerts} triage={data.triage} filter={drill.filter} />

    case 'alert':
      return <DrillAlertDetail alert={drill.alert} triage={drill.triage} />

    case 'sync_stuck':
      return (
        <Table<SyncStuckJobRow>
          size="small"
          rowKey="jobId"
          pagination={false}
          dataSource={metrics.sync.stuckJobs}
          locale={{ emptyText: 'Nenhum job preso' }}
          columns={[
            { title: 'Portal', dataIndex: 'portalType' },
            { title: 'Status', dataIndex: 'status' },
            { title: 'Minutos', dataIndex: 'minutesRunning' },
            { title: 'Link', dataIndex: 'integrationLinkId', render: (id: string) => <Text code>{id}</Text> },
            { title: 'Job', dataIndex: 'jobId', render: (id: string) => <Text code>{id}</Text> },
          ]}
        />
      )

    case 'sync_portal': {
      const portal = metrics.sync.portalStats24h.find((p) => p.portalType === drill.portalType)
      const failures = metrics.sync.recentFailures.filter((f) => f.portalType === drill.portalType)
      return (
        <>
          {portal ? (
            <Descriptions size="small" column={2} bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Total">{portal.total}</Descriptions.Item>
              <Descriptions.Item label="OK">{portal.success}</Descriptions.Item>
              <Descriptions.Item label="Falhas">{portal.failed}</Descriptions.Item>
              <Descriptions.Item label="Fail %">
                <Tag color={portal.failRatePct >= 50 ? 'error' : portal.failRatePct >= 20 ? 'warning' : 'default'}>
                  {portal.failRatePct}%
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          ) : (
            <Empty description="Sem stats para este portal" />
          )}
          <Paragraph strong>Falhas recentes</Paragraph>
          <Table<SyncRecentFailureRow>
            size="small"
            rowKey="jobId"
            pagination={{ pageSize: 6 }}
            dataSource={failures}
            locale={{ emptyText: 'Sem falhas recentes' }}
            columns={[
              { title: 'Erro', dataIndex: 'error', ellipsis: true },
              {
                title: 'Quando',
                dataIndex: 'finishedAt',
                width: 160,
                render: (d: string) => new Date(d).toLocaleString('pt-BR'),
              },
              { title: 'Job', dataIndex: 'jobId', render: (id: string) => <Text code>{id.slice(0, 8)}</Text> },
            ]}
          />
        </>
      )
    }

    case 'sync_hour':
      return (
        <Descriptions size="small" column={1} bordered>
          <Descriptions.Item label="Hora">{drill.label}</Descriptions.Item>
          <Descriptions.Item label="OK">{drill.success}</Descriptions.Item>
          <Descriptions.Item label="Falha">{drill.failed}</Descriptions.Item>
        </Descriptions>
      )

    case 'ava_events':
      return (
        <Descriptions size="small" column={1} bordered>
          <Descriptions.Item label="Hora">{drill.label}</Descriptions.Item>
          <Descriptions.Item label="Completos">{drill.completed}</Descriptions.Item>
          <Descriptions.Item label="Falhas">{drill.failed}</Descriptions.Item>
          <Descriptions.Item label="Quota bloqueada">{drill.quotaBlocked}</Descriptions.Item>
        </Descriptions>
      )

    case 'ava_tokens':
      return (
        <Descriptions size="small" column={1} bordered>
          <Descriptions.Item label="Hora">{drill.label}</Descriptions.Item>
          <Descriptions.Item label="Turnos">{drill.turns}</Descriptions.Item>
          <Descriptions.Item label="Tokens">{drill.tokens}</Descriptions.Item>
        </Descriptions>
      )

    case 'ava_window': {
      const w = drill.window === '24h' ? metrics.ava.last24h : metrics.ava.last7d
      return (
        <Descriptions size="small" column={2} bordered>
          <Descriptions.Item label="Turnos">{w.turns}</Descriptions.Item>
          <Descriptions.Item label="Tokens (soma)">{w.tokensTotalSum}</Descriptions.Item>
          <Descriptions.Item label="p50">{w.p50Tokens ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="p95">{w.p95Tokens ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="In">{w.tokensInSum}</Descriptions.Item>
          <Descriptions.Item label="Out">{w.tokensOutSum}</Descriptions.Item>
          <Descriptions.Item label="Janela">{w.windowHours}h</Descriptions.Item>
        </Descriptions>
      )
    }

    case 'ava_provider':
      return (
        <Descriptions size="small" column={1} bordered>
          <Descriptions.Item label="Provedor">{drill.provider}</Descriptions.Item>
          <Descriptions.Item label="Modelo">{drill.model}</Descriptions.Item>
          <Descriptions.Item label="Turnos">{drill.turns}</Descriptions.Item>
          <Descriptions.Item label="Tokens">{drill.tokensTotal}</Descriptions.Item>
        </Descriptions>
      )

    case 'client_errors_hour':
      return (
        <Descriptions size="small" column={1} bordered>
          <Descriptions.Item label="Hora">{drill.label}</Descriptions.Item>
          <Descriptions.Item label="Erros">{drill.count}</Descriptions.Item>
        </Descriptions>
      )

    case 'feature': {
      const row = drill.row
      const related = metrics.clientErrorFingerprints24h.filter((e) => e.feature === row.featureKey)
      return (
        <>
          <Descriptions size="small" column={2} bordered style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Feature">{row.label}</Descriptions.Item>
            <Descriptions.Item label="Área">{row.area}</Descriptions.Item>
            <Descriptions.Item label="Chave"><Text code>{row.featureKey}</Text></Descriptions.Item>
            <Descriptions.Item label="Rota">{row.routeExample ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Sessões">{row.usageSessions24h}</Descriptions.Item>
            <Descriptions.Item label="Eventos">{row.usageEvents24h}</Descriptions.Item>
            <Descriptions.Item label="Erros">{row.errorCount24h}</Descriptions.Item>
            <Descriptions.Item label="Fail %">{row.failRatePct}%</Descriptions.Item>
            <Descriptions.Item label="Contas">{row.accountCount24h}</Descriptions.Item>
            <Descriptions.Item label="Sinal">{row.signal}</Descriptions.Item>
          </Descriptions>
          {related.length > 0 && (
            <>
              <Paragraph strong>Erros cliente relacionados</Paragraph>
              <Table
                size="small"
                rowKey="fingerprint"
                pagination={false}
                dataSource={related.slice(0, 8)}
                columns={[
                  { title: 'Kind', dataIndex: 'errorKind', width: 90 },
                  { title: 'Code', dataIndex: 'errorCode', width: 100 },
                  { title: 'Count', dataIndex: 'count', width: 64 },
                ]}
              />
            </>
          )}
        </>
      )
    }

    case 'client_error_fp': {
      const row = drill.row
      return (
        <Descriptions size="small" column={1} bordered>
          <Descriptions.Item label="Feature">
            {resolveClientFeatureLabel(row.feature)} ({resolveClientFeatureArea(row.feature)})
          </Descriptions.Item>
          <Descriptions.Item label="Chave"><Text code>{row.feature}</Text></Descriptions.Item>
          <Descriptions.Item label="Kind">{row.errorKind}</Descriptions.Item>
          <Descriptions.Item label="Code">{row.errorCode}</Descriptions.Item>
          <Descriptions.Item label="Ocorrências">{row.count}</Descriptions.Item>
          <Descriptions.Item label="Contas">{row.accountCount}</Descriptions.Item>
          <Descriptions.Item label="Último">
            {new Date(row.lastSeenAt).toLocaleString('pt-BR')}
          </Descriptions.Item>
          <Descriptions.Item label="Fingerprint"><Text code>{row.fingerprint}</Text></Descriptions.Item>
        </Descriptions>
      )
    }

    case 'error_fp': {
      const row = drill.row
      return (
        <Descriptions size="small" column={1} bordered>
          <Descriptions.Item label="Evento">{row.eventName}</Descriptions.Item>
          <Descriptions.Item label="Ocorrências">{row.count}</Descriptions.Item>
          <Descriptions.Item label="Último">
            {new Date(row.lastSeenAt).toLocaleString('pt-BR')}
          </Descriptions.Item>
          <Descriptions.Item label="Fingerprint"><Text code>{row.fingerprint}</Text></Descriptions.Item>
        </Descriptions>
      )
    }

    case 'probe': {
      const probe = metrics.probe
      if (!probe) return <Empty description="Probe indisponível" />
      const target = drill.target === 'api' ? probe.api : drill.target === 'postgres' ? probe.postgres : probe.neo4j
      if (!target) return <Empty description="Target não configurado" />
      return (
        <Descriptions size="small" column={1} bordered>
          <Descriptions.Item label="Target">{drill.target}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={target.ok ? 'success' : 'error'}>{target.ok ? 'ok' : 'down'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Latência">{target.latencyMs} ms</Descriptions.Item>
          {drill.target === 'api' && probe.api.status != null && (
            <Descriptions.Item label="HTTP">{probe.api.status}</Descriptions.Item>
          )}
          {target.error && (
            <Descriptions.Item label="Erro">{target.error}</Descriptions.Item>
          )}
          <Descriptions.Item label="Verificado">
            {new Date(probe.checkedAt).toLocaleString('pt-BR')}
          </Descriptions.Item>
        </Descriptions>
      )
    }

    case 'runtime': {
      const runtime = data.runtime
      if (!runtime) return <Empty description="Sem dados de runtime" />
      return (
        <Descriptions size="small" column={1} bordered>
          <Descriptions.Item label="Ava lite">
            {runtime.avaLite ? runtime.avaLiteReason ?? 'ativo' : 'off'}
          </Descriptions.Item>
          <Descriptions.Item label="Leitura degradada">
            {runtime.degradedRead
              ? `${runtime.degradedReadAsOf ?? 'D-1'} — ${runtime.degradedReadReason ?? ''}`
              : 'off'}
          </Descriptions.Item>
          <Descriptions.Item label="Sync pausado">
            {runtime.syncDegradedPortals.length ? runtime.syncDegradedPortals.join(', ') : '—'}
          </Descriptions.Item>
        </Descriptions>
      )
    }

    case 'internal_llm': {
      const llm = metrics.internalLlm
      if (!llm) return <Empty description="LLM interno indisponível" />
      const labels = { llm: 'LLM ok', fallback: 'Fallback local', budget: 'Budget esgotado' }
      const counts = {
        llm: llm.llmResolved,
        fallback: llm.localFallback,
        budget: llm.budgetExhausted,
      }
      return (
        <>
          {drill.outcome && (
            <Descriptions size="small" column={1} bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Desfecho">{labels[drill.outcome]}</Descriptions.Item>
              <Descriptions.Item label="Contagem">{counts[drill.outcome]}</Descriptions.Item>
            </Descriptions>
          )}
          <Descriptions size="small" column={2} bordered>
            <Descriptions.Item label="Chamadas">{llm.calls}</Descriptions.Item>
            <Descriptions.Item label="LLM ok">{llm.llmResolved}</Descriptions.Item>
            <Descriptions.Item label="Fallback">{llm.localFallback}</Descriptions.Item>
            <Descriptions.Item label="Budget">{llm.budgetExhausted}</Descriptions.Item>
            <Descriptions.Item label="USD">{formatUsdCents(llm.totalCostUsdCents)}</Descriptions.Item>
            <Descriptions.Item label="Gasto BRL">{formatBrl(llm.spentBrlCents)}</Descriptions.Item>
          </Descriptions>
        </>
      )
    }

    case 'budget': {
      const llm = metrics.internalLlm
      if (!llm) return <Empty description="Orçamento indisponível" />
      return (
        <Descriptions size="small" column={1} bordered>
          <Descriptions.Item label="Teto mensal">{formatBrl(llm.monthlyBudgetBrlCents)}</Descriptions.Item>
          <Descriptions.Item label="Gasto">{formatBrl(llm.spentBrlCents)}</Descriptions.Item>
          <Descriptions.Item label="Restante">
            <Tag color={llm.exhausted ? 'error' : 'success'}>{formatBrl(llm.remainingBrlCents)}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Esgotado">{llm.exhausted ? 'Sim' : 'Não'}</Descriptions.Item>
        </Descriptions>
      )
    }

    case 'support_report': {
      const row = drill.row
      return (
        <>
          {row.descriptionPreview && (
            <Paragraph type="secondary">{row.descriptionPreview}</Paragraph>
          )}
          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="ID"><Text code>{row.id}</Text></Descriptions.Item>
            <Descriptions.Item label="Categoria">{CATEGORY_LABEL[row.category] ?? row.category}</Descriptions.Item>
            <Descriptions.Item label="Rota">{row.route ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Conta"><Text code>{row.accountId}</Text></Descriptions.Item>
            <Descriptions.Item label="App">{row.appVersion ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Screenshot">{row.hasScreenshot ? 'Sim' : 'Não'}</Descriptions.Item>
            <Descriptions.Item label="Consent. técnico">{row.consentTechnical ? 'Sim' : 'Não'}</Descriptions.Item>
            <Descriptions.Item label="Consent. perfil">{row.consentProfileAccess ? 'Sim' : 'Não'}</Descriptions.Item>
            <Descriptions.Item label="Criado">
              {new Date(row.createdAt).toLocaleString('pt-BR')}
            </Descriptions.Item>
            <Descriptions.Item label="Expira">
              {new Date(row.expiresAt).toLocaleString('pt-BR')}
            </Descriptions.Item>
          </Descriptions>
          {row.consentTechnical && Object.keys(row.diagnosticContext).length > 0 && (
            <>
              <Paragraph strong style={{ marginTop: 16 }}>Bundle técnico</Paragraph>
              <JsonBlock value={row.diagnosticContext} />
            </>
          )}
        </>
      )
    }

    default:
      return null
  }
}

function OpsDetailModal({
  drill,
  data,
  onClose,
}: {
  drill: OpsDrillDown | null
  data: OpsMetricsResponse
  onClose: () => void
}) {
  return (
    <Modal
      open={drill != null}
      title={drill ? modalTitle(drill) : ''}
      onCancel={onClose}
      footer={null}
      width={760}
      destroyOnClose
      className="ops-drill-modal"
    >
      {drill && <DrillContent drill={drill} data={data} />}
    </Modal>
  )
}

export function OpsDrillDownProvider({
  data,
  children,
}: {
  data: OpsMetricsResponse
  children: ReactNode
}) {
  const [drill, setDrill] = useState<OpsDrillDown | null>(null)
  const value = useMemo(
    () => ({
      open: setDrill,
      close: () => setDrill(null),
    }),
    [],
  )

  return (
    <OpsDrillDownContext.Provider value={value}>
      {children}
      <OpsDetailModal drill={drill} data={data} onClose={value.close} />
    </OpsDrillDownContext.Provider>
  )
}
