import { useState } from 'react'
import {
  Alert,
  Button,
  Empty,
  Input,
  Modal,
  message,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import { RobotOutlined } from '@ant-design/icons'
import type { OpsAlert, OpsAlertAnalysisRecord, OpsMetricsResponse } from './ops.types.js'
import { OpsPanel } from './components/OpsPanel.js'
import { useOpsDrillDown } from './ops-drill-down.js'
import { opsApi } from './api.js'

const { Text, Paragraph } = Typography
const { TextArea } = Input

const SEVERITY_COLOR: Record<OpsAlert['severity'], string> = {
  critical: 'error',
  warning: 'warning',
}

const ANALYSIS_LABEL: Record<OpsAlertAnalysisRecord['analysisStatus'], string> = {
  none: 'Sem análise',
  pending: 'Pendente',
  in_progress: 'Em análise',
  completed: 'Concluída',
  failed: 'Falhou',
}

const ANALYSIS_COLOR: Record<OpsAlertAnalysisRecord['analysisStatus'], string> = {
  none: 'default',
  pending: 'gold',
  in_progress: 'processing',
  completed: 'success',
  failed: 'error',
}

function analysisFor(
  data: OpsMetricsResponse,
  alertId: string,
): OpsAlertAnalysisRecord {
  return data.alertAnalysis?.[alertId] ?? {
    alertId,
    analysisStatus: 'none',
    operatorNotes: null,
    analysisSummary: null,
    analysisArtifactPath: null,
    analysisRequestedAt: null,
    analysisCompletedAt: null,
    analysisLastError: null,
    lastSeverity: null,
    lastCategory: null,
    lastMessage: null,
  }
}

export function OpsAlertsTable({
  data,
  onRefresh,
  filter,
  title = 'Alertas derivados',
  description = 'Triagem pager + investigação Cursor (Tier 0). Clique na linha para detalhes.',
}: {
  data: OpsMetricsResponse
  onRefresh?: () => void | Promise<void>
  filter?: { severity?: OpsAlert['severity']; category?: OpsAlert['category'] }
  title?: string
  description?: string
}) {
  const { open } = useOpsDrillDown()
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [analyzeTarget, setAnalyzeTarget] = useState<OpsAlert | null>(null)
  const [analyzeNotes, setAnalyzeNotes] = useState('')
  const [completeTarget, setCompleteTarget] = useState<OpsAlert | null>(null)
  const [completeSummary, setCompleteSummary] = useState('')
  const [completeArtifact, setCompleteArtifact] = useState('')

  let alerts = data.alerts
  if (filter?.severity) alerts = alerts.filter((a) => a.severity === filter.severity)
  if (filter?.category) alerts = alerts.filter((a) => a.category === filter.category)

  const openAnalyze = (row: OpsAlert) => {
    const analysis = analysisFor(data, row.id)
    setAnalyzeTarget(row)
    setAnalyzeNotes(analysis.operatorNotes ?? '')
  }

  const submitAnalyze = async () => {
    if (!analyzeTarget) return
    setUpdatingId(analyzeTarget.id)
    try {
      const result = await opsApi.analyzeOpsAlert(analyzeTarget.id, analyzeNotes)
      message.success(result.message)
      setAnalyzeTarget(null)
      await onRefresh?.()
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Falha ao disparar análise')
    } finally {
      setUpdatingId(null)
    }
  }

  const openComplete = (row: OpsAlert) => {
    const analysis = analysisFor(data, row.id)
    setCompleteTarget(row)
    setCompleteSummary(analysis.analysisSummary ?? '')
    setCompleteArtifact(analysis.analysisArtifactPath ?? '')
  }

  const submitComplete = async () => {
    if (!completeTarget) return
    if (!completeSummary.trim() && !completeArtifact.trim()) {
      message.warning('Informe um resumo ou caminho do artefato')
      return
    }
    setUpdatingId(completeTarget.id)
    try {
      await opsApi.completeOpsAlertAnalysis(completeTarget.id, {
        analysisSummary: completeSummary,
        analysisArtifactPath: completeArtifact || undefined,
      })
      message.success('Análise marcada como concluída')
      setCompleteTarget(null)
      await onRefresh?.()
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Falha ao concluir análise')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <OpsPanel title={title} description={description}>
      {alerts.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nenhum alerta no momento" />
      ) : (
        <Table<OpsAlert>
          size="small"
          rowKey="id"
          pagination={false}
          dataSource={alerts}
          onRow={(row) => ({
            className: 'ops-row-clickable',
            onClick: () => open({
              kind: 'alert',
              alert: row,
              triage: data.triage?.find((x) => x.alertId === row.id),
            }),
          })}
          columns={[
            {
              title: 'Pager',
              key: 'human',
              width: 72,
              render: (_: unknown, row: OpsAlert) => {
                const t = data.triage?.find((x) => x.alertId === row.id)
                return t?.humanRequired ? <Tag color="error">humano</Tag> : <Tag>auto</Tag>
              },
            },
            {
              title: 'Análise',
              key: 'analysis',
              width: 110,
              render: (_: unknown, row: OpsAlert) => {
                const a = analysisFor(data, row.id)
                return (
                  <Tag color={ANALYSIS_COLOR[a.analysisStatus]}>
                    {ANALYSIS_LABEL[a.analysisStatus]}
                  </Tag>
                )
              },
            },
            {
              title: 'Severidade',
              dataIndex: 'severity',
              width: 100,
              render: (s: OpsAlert['severity']) => <Tag color={SEVERITY_COLOR[s]}>{s}</Tag>,
            },
            { title: 'Categoria', dataIndex: 'category', width: 90 },
            { title: 'Mensagem', dataIndex: 'message' },
            {
              title: 'ID',
              dataIndex: 'id',
              width: 160,
              render: (id: string) => <Text code>{id}</Text>,
            },
            {
              title: 'Ações',
              key: 'actions',
              width: 220,
              render: (_: unknown, row: OpsAlert) => {
                const a = analysisFor(data, row.id)
                return (
                  <Space size={4} wrap onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="small"
                      icon={<RobotOutlined />}
                      loading={updatingId === row.id}
                      onClick={() => openAnalyze(row)}
                    >
                      {a.analysisStatus === 'completed' || a.analysisStatus === 'in_progress'
                        ? 'Reanalisar'
                        : 'Analisar'}
                    </Button>
                    {a.analysisStatus !== 'completed' && (
                      <Button
                        size="small"
                        loading={updatingId === row.id}
                        onClick={() => openComplete(row)}
                      >
                        Concluir
                      </Button>
                    )}
                  </Space>
                )
              },
            },
          ]}
        />
      )}

      <Modal
        title={`Analisar alerta ${analyzeTarget?.id ?? ''}`}
        open={analyzeTarget != null}
        onCancel={() => setAnalyzeTarget(null)}
        onOk={() => void submitAnalyze()}
        okText="Disparar agente"
        confirmLoading={updatingId === analyzeTarget?.id}
        destroyOnClose
      >
        <Paragraph type="secondary">
          Contexto ops para o agente Cursor (sem PHI). Ex.: «reiniciei API», «PG lento após backup»,
          «só em preview».
        </Paragraph>
        {analyzeTarget && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message={analyzeTarget.message}
            description={`${analyzeTarget.severity} · ${analyzeTarget.category}`}
          />
        )}
        <TextArea
          rows={4}
          maxLength={2000}
          value={analyzeNotes}
          onChange={(e) => setAnalyzeNotes(e.target.value)}
          placeholder="Notas opcionais para a investigação Tier 0…"
        />
        {analyzeTarget && analysisFor(data, analyzeTarget.id).analysisLastError && (
          <Alert
            type="warning"
            showIcon
            style={{ marginTop: 12 }}
            message="Último erro"
            description={analysisFor(data, analyzeTarget.id).analysisLastError}
          />
        )}
      </Modal>

      <Modal
        title={`Concluir análise ${completeTarget?.id ?? ''}`}
        open={completeTarget != null}
        onCancel={() => setCompleteTarget(null)}
        onOk={() => void submitComplete()}
        okText="Marcar concluída"
        confirmLoading={updatingId === completeTarget?.id}
        destroyOnClose
      >
        <TextArea
          rows={4}
          maxLength={4000}
          value={completeSummary}
          onChange={(e) => setCompleteSummary(e.target.value)}
          placeholder="Resumo da conclusão…"
          style={{ marginBottom: 12 }}
        />
        <Input
          maxLength={512}
          value={completeArtifact}
          onChange={(e) => setCompleteArtifact(e.target.value)}
          placeholder="Caminho do artefato (opcional), ex. docs/ops/investigations/2026-09-08-infra_api_down.md"
        />
      </Modal>
    </OpsPanel>
  )
}
