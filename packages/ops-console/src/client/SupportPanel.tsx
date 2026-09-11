import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Descriptions,
  Input,
  Modal,
  message,
  Segmented,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import { ReloadOutlined, RobotOutlined } from '@ant-design/icons'
import type { SupportReportOpsRow } from './ops.types.js'
import { OpsKpiCard, OpsKpiGrid } from './components/OpsKpiCard.js'
import { OpsPanel } from './components/OpsPanel.js'
import { useOpsDrillDown } from './ops-drill-down.js'
import { opsApi } from './api.js'

const { Text, Paragraph } = Typography
const { TextArea } = Input

const CATEGORY_LABEL: Record<string, string> = {
  technical_bug: 'Erro técnico',
  incorrect_data: 'Dado incorreto',
  ux_confusion: 'Confusão de UX',
  other: 'Outro',
}

const STATUS_LABEL: Record<string, string> = {
  open: 'Aberto',
  triaged: 'Triado',
  resolved: 'Resolvido',
  closed: 'Fechado',
}

const ANALYSIS_LABEL: Record<SupportReportOpsRow['analysisStatus'], string> = {
  none: 'Sem análise',
  pending: 'Pendente',
  in_progress: 'Em análise',
  completed: 'Concluída',
  failed: 'Falhou',
}

const ANALYSIS_COLOR: Record<SupportReportOpsRow['analysisStatus'], string> = {
  none: 'default',
  pending: 'gold',
  in_progress: 'processing',
  completed: 'success',
  failed: 'error',
}

type QueueStatus = 'open' | 'triaged' | 'resolved'

export function SupportPanel({
  openCount,
  submitted24h,
  onQueueChange,
}: {
  openCount: number
  submitted24h: number
  onQueueChange?: () => void
}) {
  const { open } = useOpsDrillDown()
  const [loading, setLoading] = useState(true)
  const [queueStatus, setQueueStatus] = useState<QueueStatus>('open')
  const [rows, setRows] = useState<SupportReportOpsRow[]>([])
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [localOpenCount, setLocalOpenCount] = useState(openCount)
  const [analyzeTarget, setAnalyzeTarget] = useState<SupportReportOpsRow | null>(null)
  const [analyzeNotes, setAnalyzeNotes] = useState('')
  const [completeTarget, setCompleteTarget] = useState<SupportReportOpsRow | null>(null)
  const [completeSummary, setCompleteSummary] = useState('')
  const [completeArtifact, setCompleteArtifact] = useState('')

  useEffect(() => {
    setLocalOpenCount(openCount)
  }, [openCount])

  const load = useCallback(async (status: QueueStatus = queueStatus) => {
    setLoading(true)
    try {
      const result = await opsApi.supportReports(status)
      setRows(result.reports)
      if (status === 'open') {
        setLocalOpenCount(result.reports.length)
      }
    } catch (err) {
      setRows([])
      message.error(err instanceof Error ? err.message : 'Falha ao carregar fila')
    } finally {
      setLoading(false)
    }
  }, [queueStatus])

  useEffect(() => {
    void load(queueStatus)
  }, [load, queueStatus])

  const setStatus = async (id: string, status: 'triaged' | 'resolved') => {
    setUpdatingId(id)
    try {
      await opsApi.updateSupportReport(id, status)
      const label = STATUS_LABEL[status] ?? status
      message.success(`Chamado ${id.slice(0, 8)} marcado como ${label}`)
      onQueueChange?.()
      await load(queueStatus)
      if (status === 'triaged' || status === 'resolved') {
        setLocalOpenCount((n) => Math.max(0, n - 1))
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Não foi possível atualizar o chamado')
    } finally {
      setUpdatingId(null)
    }
  }

  const openAnalyzeModal = (row: SupportReportOpsRow) => {
    setAnalyzeTarget(row)
    setAnalyzeNotes(row.operatorNotes ?? '')
  }

  const submitAnalyze = async () => {
    if (!analyzeTarget) return
    setUpdatingId(analyzeTarget.id)
    try {
      const result = await opsApi.analyzeSupportReport(analyzeTarget.id, analyzeNotes)
      message.success(result.message)
      setAnalyzeTarget(null)
      onQueueChange?.()
      await load(queueStatus)
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Falha ao disparar análise')
    } finally {
      setUpdatingId(null)
    }
  }

  const openCompleteModal = (row: SupportReportOpsRow) => {
    setCompleteTarget(row)
    setCompleteSummary(row.analysisSummary ?? '')
    setCompleteArtifact(row.analysisArtifactPath ?? '')
  }

  const submitComplete = async () => {
    if (!completeTarget) return
    if (!completeSummary.trim() && !completeArtifact.trim()) {
      message.warning('Informe um resumo ou caminho do artefato')
      return
    }
    setUpdatingId(completeTarget.id)
    try {
      await opsApi.completeSupportAnalysis(completeTarget.id, {
        analysisSummary: completeSummary,
        analysisArtifactPath: completeArtifact || undefined,
      })
      message.success('Análise marcada como concluída')
      setCompleteTarget(null)
      onQueueChange?.()
      await load(queueStatus)
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Falha ao concluir análise')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="ops-panel-stack">
      <OpsKpiStrip
        openCount={localOpenCount}
        submitted24h={submitted24h}
        onOpenClick={() => {
          setQueueStatus('open')
          if (rows[0]) open({ kind: 'support_report', row: rows[0] })
        }}
      />

      <Alert
        type="info"
        showIcon
        message="Ciclo de suporte"
        description={(
          <>
            <strong>Triar/Resolver</strong> atualiza a fila humana.{' '}
            <strong>Analisar</strong> dispara o agente Cursor (Tier 0) — use notas para contexto
            extra. Chamados sem webhook configurado ficam «Sem análise» até você analisar manualmente
            ou concluir com resumo.
          </>
        )}
        style={{ marginBottom: 8 }}
      />

      <Alert
        type="warning"
        showIcon
        message="Dados sensíveis"
        description="Descrições livres podem conter PHI — não copiar para Slack. Bundle técnico só com consentimento."
        style={{ marginBottom: 8 }}
      />

      <OpsPanel
        title="Fila de suporte"
        description="Chamados «Reportar problema» — migration 061 + ciclo de análise 064."
        extra={(
          <Space size={8}>
            <Segmented
              size="small"
              value={queueStatus}
              options={[
                { label: 'Abertos', value: 'open' },
                { label: 'Triados', value: 'triaged' },
                { label: 'Resolvidos', value: 'resolved' },
              ]}
              onChange={(v) => setQueueStatus(v as QueueStatus)}
            />
            <Button size="small" icon={<ReloadOutlined />} onClick={() => void load(queueStatus)} loading={loading}>
              Atualizar
            </Button>
          </Space>
        )}
      >
        <Table<SupportReportOpsRow>
          size="small"
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          dataSource={rows}
          locale={{ emptyText: `Nenhum chamado ${STATUS_LABEL[queueStatus]?.toLowerCase() ?? queueStatus}` }}
          onRow={(row) => ({
            className: 'ops-row-clickable',
            onClick: () => open({ kind: 'support_report', row }),
          })}
          expandable={{
            expandedRowRender: (row) => (
              <SupportReportDetail row={row} />
            ),
          }}
          columns={[
            {
              title: 'ID',
              dataIndex: 'id',
              width: 100,
              render: (id: string) => <Text code>{id.slice(0, 8)}</Text>,
            },
            {
              title: 'Fila',
              dataIndex: 'status',
              width: 88,
              render: (s: string) => <Tag>{STATUS_LABEL[s] ?? s}</Tag>,
            },
            {
              title: 'Análise',
              dataIndex: 'analysisStatus',
              width: 110,
              render: (s: SupportReportOpsRow['analysisStatus']) => (
                <Tag color={ANALYSIS_COLOR[s]}>{ANALYSIS_LABEL[s] ?? s}</Tag>
              ),
            },
            {
              title: 'Categoria',
              dataIndex: 'category',
              width: 120,
              render: (c: string) => CATEGORY_LABEL[c] ?? c,
            },
            { title: 'Rota', dataIndex: 'route', ellipsis: true },
            {
              title: 'Consent.',
              key: 'consent',
              width: 100,
              render: (_: unknown, row: SupportReportOpsRow) => (
                <Space size={4}>
                  {row.consentTechnical && <Tag>tec</Tag>}
                  {row.consentProfileAccess && <Tag color="blue">perfil</Tag>}
                </Space>
              ),
            },
            {
              title: 'Quando',
              dataIndex: 'createdAt',
              width: 150,
              render: (d: string) => new Date(d).toLocaleString('pt-BR'),
            },
            {
              title: 'Ações',
              key: 'actions',
              width: 280,
              render: (_: unknown, row: SupportReportOpsRow) => (
                <Space size={4} wrap onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="small"
                    icon={<RobotOutlined />}
                    loading={updatingId === row.id}
                    onClick={() => openAnalyzeModal(row)}
                  >
                    {row.analysisStatus === 'completed' || row.analysisStatus === 'in_progress'
                      ? 'Reanalisar'
                      : 'Analisar'}
                  </Button>
                  {row.analysisStatus !== 'completed' && (
                    <Button
                      size="small"
                      loading={updatingId === row.id}
                      onClick={() => openCompleteModal(row)}
                    >
                      Concluir
                    </Button>
                  )}
                  {queueStatus === 'open' && (
                    <Button
                      size="small"
                      loading={updatingId === row.id}
                      onClick={() => void setStatus(row.id, 'triaged')}
                    >
                      Triar
                    </Button>
                  )}
                  {queueStatus !== 'resolved' && (
                    <Button
                      size="small"
                      type="primary"
                      loading={updatingId === row.id}
                      onClick={() => void setStatus(row.id, 'resolved')}
                    >
                      Resolver
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </OpsPanel>

      <Modal
        title={`Analisar chamado ${analyzeTarget?.id.slice(0, 8) ?? ''}`}
        open={analyzeTarget != null}
        onCancel={() => setAnalyzeTarget(null)}
        onOk={() => void submitAnalyze()}
        okText="Disparar agente"
        confirmLoading={updatingId === analyzeTarget?.id}
        destroyOnClose
      >
        <Paragraph type="secondary">
          Notas para o agente Cursor (sem PHI). Ex.: «usuário disse que sumiu após sync Unimed»,
          «reproduziu em preview :5174».
        </Paragraph>
        <TextArea
          rows={4}
          maxLength={2000}
          value={analyzeNotes}
          onChange={(e) => setAnalyzeNotes(e.target.value)}
          placeholder="Contexto opcional para a investigação Tier 0…"
        />
        {analyzeTarget?.analysisLastError && (
          <Alert
            type="warning"
            showIcon
            style={{ marginTop: 12 }}
            message="Último erro"
            description={analyzeTarget.analysisLastError}
          />
        )}
      </Modal>

      <Modal
        title={`Concluir análise ${completeTarget?.id.slice(0, 8) ?? ''}`}
        open={completeTarget != null}
        onCancel={() => setCompleteTarget(null)}
        onOk={() => void submitComplete()}
        okText="Marcar concluída"
        confirmLoading={updatingId === completeTarget?.id}
        destroyOnClose
      >
        <Paragraph type="secondary">
          Use quando o agente terminou ou você investigou manualmente — fecha o ciclo de análise
          (independente de Triar/Resolver).
        </Paragraph>
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
          placeholder="Caminho do artefato (opcional), ex. docs/ops/investigations/2026-09-08-abc.md"
        />
      </Modal>
    </div>
  )
}

function SupportReportDetail({ row }: { row: SupportReportOpsRow }) {
  return (
    <div style={{ maxWidth: 720 }}>
      {row.descriptionPreview && (
        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
          {row.descriptionPreview}
        </Text>
      )}
      <Descriptions size="small" column={1} bordered>
        <Descriptions.Item label="Fila">
          <Tag>{STATUS_LABEL[row.status] ?? row.status}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Análise">
          <Tag color={ANALYSIS_COLOR[row.analysisStatus]}>
            {ANALYSIS_LABEL[row.analysisStatus]}
          </Tag>
        </Descriptions.Item>
        {row.analysisRequestedAt && (
          <Descriptions.Item label="Análise solicitada">
            {new Date(row.analysisRequestedAt).toLocaleString('pt-BR')}
          </Descriptions.Item>
        )}
        {row.analysisCompletedAt && (
          <Descriptions.Item label="Análise concluída">
            {new Date(row.analysisCompletedAt).toLocaleString('pt-BR')}
          </Descriptions.Item>
        )}
        {row.operatorNotes && (
          <Descriptions.Item label="Notas do operador">{row.operatorNotes}</Descriptions.Item>
        )}
        {row.analysisSummary && (
          <Descriptions.Item label="Resumo">{row.analysisSummary}</Descriptions.Item>
        )}
        {row.analysisArtifactPath && (
          <Descriptions.Item label="Artefato">
            <Text code>{row.analysisArtifactPath}</Text>
          </Descriptions.Item>
        )}
        {row.analysisLastError && (
          <Descriptions.Item label="Erro análise">
            <Text type="danger">{row.analysisLastError}</Text>
          </Descriptions.Item>
        )}
        <Descriptions.Item label="Conta">
          <Text code>{row.accountId}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="App">{row.appVersion ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="Expira">
          {new Date(row.expiresAt).toLocaleString('pt-BR')}
        </Descriptions.Item>
      </Descriptions>
      {row.consentTechnical && Object.keys(row.diagnosticContext).length > 0 && (
        <pre style={{ marginTop: 12, fontSize: 11, maxHeight: 240, overflow: 'auto' }}>
          {JSON.stringify(row.diagnosticContext, null, 2)}
        </pre>
      )}
    </div>
  )
}

function OpsKpiStrip({
  openCount,
  submitted24h,
  onOpenClick,
}: {
  openCount: number
  submitted24h: number
  onOpenClick?: () => void
}) {
  return (
    <OpsKpiGrid>
      <OpsKpiCard label="Abertos" value={openCount} alert={openCount > 0} onClick={onOpenClick} />
      <OpsKpiCard label="Submetidos (24h)" value={submitted24h} />
    </OpsKpiGrid>
  )
}
