import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Empty,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd'
import {
  CheckOutlined,
  LinkOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import {
  incidentApplicationLabel,
  incidentOriginLabel,
  incidentPipelineLabel,
  incidentPipelineTagColor,
} from './ch-incident-display.js'
import { InvestigationIdTag } from './components/InvestigationIdTag.js'
import { OpsPanel } from './components/OpsPanel.js'
import { opsApi } from './api.js'
import type { OpsAnalysisQueueItem } from './ops.types.js'

const { Text, Paragraph } = Typography

const LANE_LABEL: Record<OpsAnalysisQueueItem['lane'], string> = {
  development_support: 'Dev',
  sre_support: 'SRE',
}

const PIPELINE_STATUS_LABEL: Record<OpsAnalysisQueueItem['status'], string> = {
  queued: 'Na fila',
  investigating: 'Investigando',
  fix_proposed: 'Solução proposta',
  completed: 'Concluída',
  dismissed: 'Descartada',
  failed: 'Falhou',
}

function buildInvestigationDeepLink(investigationId: string): string {
  const params = new URLSearchParams()
  params.set('group', 'operacao')
  params.set('tab', 'incidentes')
  params.set('investigationId', investigationId)
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`
}

export function IncidentesPanel({
  onRefresh,
  highlightInvestigationId,
}: {
  onRefresh?: () => void
  highlightInvestigationId?: string | null
}) {
  const [items, setItems] = useState<OpsAnalysisQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await opsApi.analysisQueue()
      setItems(data.items)
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Falha ao carregar incidentes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (highlightInvestigationId) {
      setExpandedRowKeys((prev) =>
        prev.includes(highlightInvestigationId) ? prev : [...prev, highlightInvestigationId],
      )
    }
  }, [highlightInvestigationId])

  const markComplete = async (id: string) => {
    setUpdatingId(id)
    try {
      await opsApi.completeAnalysisQueueItem(id)
      message.success('Incidente marcado como concluído')
      await load()
      await onRefresh?.()
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Falha ao concluir')
    } finally {
      setUpdatingId(null)
    }
  }

  const openDetail = (id: string) => {
    setExpandedRowKeys((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }

  const copyInvestigationLink = async (id: string) => {
    try {
      await navigator.clipboard.writeText(buildInvestigationDeepLink(id))
      message.success('Link do incidente copiado')
    } catch {
      message.error('Não foi possível copiar o link')
    }
  }

  const canMarkComplete = (status: OpsAnalysisQueueItem['status']) =>
    status === 'fix_proposed' || status === 'investigating' || status === 'queued' || status === 'failed'

  return (
    <OpsPanel
      title="Incidentes"
      description="Sinais cru até triagem — dados ao vivo via GET /api/analysis-queue (Postgres ops_analysis_queue)."
    >
      {items.length === 0 && !loading ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nenhum incidente aberto" />
      ) : (
        <Table<OpsAnalysisQueueItem>
          className="ops-incidentes-table"
          size="small"
          rowKey="id"
          loading={loading}
          pagination={false}
          dataSource={items}
          rowClassName={(row) =>
            highlightInvestigationId && row.id === highlightInvestigationId
              ? 'ops-row-highlight'
              : ''
          }
          expandable={{
            expandedRowKeys,
            onExpandedRowsChange: (keys) => setExpandedRowKeys(keys.map(String)),
            expandedRowRender: (row) => (
              <div style={{ maxWidth: 720 }}>
                <Paragraph type="secondary">
                  Pipeline CH: {incidentPipelineLabel(row)} · Fila: {PIPELINE_STATUS_LABEL[row.status]} ·
                  Lane {LANE_LABEL[row.lane]} · {row.deploymentTier}
                  {row.incidentPipelineStatus && (
                    <>
                      {' '}
                      · <Text code>{row.incidentPipelineStatus}</Text>
                    </>
                  )}
                </Paragraph>
                {row.remediationSummary && (
                  <Paragraph>
                    <Text strong>Remediação:</Text> {row.remediationSummary}
                  </Paragraph>
                )}
                {row.analysisArtifactPath && (
                  <Paragraph>
                    <Text strong>Artefato:</Text> <Text code>{row.analysisArtifactPath}</Text>
                  </Paragraph>
                )}
                {row.prUrl && (
                  <Paragraph>
                    <Text strong>PR:</Text>{' '}
                    <a href={row.prUrl} target="_blank" rel="noreferrer">{row.prUrl}</a>
                  </Paragraph>
                )}
                {row.errorSummary && (
                  <Paragraph>
                    <Text strong>Contexto:</Text> {row.errorSummary}
                  </Paragraph>
                )}
                {row.analysisLastError && (
                  <Paragraph type="danger">{row.analysisLastError}</Paragraph>
                )}
                <Paragraph>
                  <Text strong>investigationId:</Text>{' '}
                  <InvestigationIdTag investigationId={row.id} showFull />
                </Paragraph>
                <Text type="secondary">
                  {row.sourceType} · {row.sourceId}
                </Text>
              </div>
            ),
          }}
          columns={[
            {
              title: 'Timestamp',
              dataIndex: 'queuedAt',
              width: 148,
              render: (v: string) => new Date(v).toLocaleString('pt-BR'),
            },
            {
              title: 'Título',
              dataIndex: 'title',
              ellipsis: { showTitle: true },
            },
            {
              title: 'Aplicação',
              key: 'application',
              width: 96,
              align: 'center',
              render: (_: unknown, row) => incidentApplicationLabel(row),
            },
            {
              title: 'Origem',
              key: 'origin',
              width: 120,
              align: 'center',
              render: (_: unknown, row) => <Tag>{incidentOriginLabel(row)}</Tag>,
            },
            {
              title: 'Status',
              key: 'pipelineStatus',
              width: 120,
              align: 'center',
              render: (_: unknown, row) => (
                <Tag color={incidentPipelineTagColor(row)}>{incidentPipelineLabel(row)}</Tag>
              ),
            },
            {
              title: 'ID',
              dataIndex: 'id',
              width: 72,
              align: 'center',
              render: (id: string) => <InvestigationIdTag investigationId={id} compact />,
            },
            {
              title: 'Ações',
              key: 'actions',
              width: 132,
              align: 'center',
              render: (_: unknown, row) => (
                <Space size={0} wrap style={{ justifyContent: 'center' }}>
                  <Tooltip title="Abrir detalhe">
                    <Button
                      type="text"
                      size="small"
                      icon={<UnorderedListOutlined />}
                      aria-label="Detalhe"
                      onClick={(e) => {
                        e.stopPropagation()
                        openDetail(row.id)
                      }}
                    />
                  </Tooltip>
                  <Tooltip title="Copiar link com investigationId">
                    <Button
                      type="text"
                      size="small"
                      icon={<LinkOutlined />}
                      aria-label="Link investigação"
                      onClick={(e) => {
                        e.stopPropagation()
                        void copyInvestigationLink(row.id)
                      }}
                    />
                  </Tooltip>
                  {canMarkComplete(row.status) && (
                    <Tooltip title={row.status === 'fix_proposed' ? 'Revisado' : 'Concluir triagem'}>
                      <Button
                        type="text"
                        size="small"
                        icon={<CheckOutlined />}
                        aria-label="Concluir"
                        loading={updatingId === row.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          void markComplete(row.id)
                        }}
                      />
                    </Tooltip>
                  )}
                </Space>
              ),
            },
          ]}
        />
      )}
    </OpsPanel>
  )
}

/** @deprecated use IncidentesPanel */
export const IssuesPanel = IncidentesPanel
