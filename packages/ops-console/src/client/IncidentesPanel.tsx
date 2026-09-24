import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Empty, Space, Table, Tag, Typography, message } from 'antd'
import {
  incidentApplicationLabel,
  incidentOriginLabel,
  incidentTriageLabel,
  incidentTriageStatus,
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

  return (
    <OpsPanel
      title="Incidentes"
      description="Sinais cru até triagem — reportes de usuário, alertas ops e investigações automáticas."
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="Triagem"
        description="Em aberto → Em triagem → defeito plataforma, falha infra ou encerramento. Chamados em Produto › Suporte geram incidente com origem Usuário."
      />
      {items.length === 0 && !loading ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nenhum incidente aberto" />
      ) : (
        <Table<OpsAnalysisQueueItem>
          size="small"
          rowKey="id"
          loading={loading}
          pagination={false}
          dataSource={items}
          rowClassName={(row) => (
            highlightInvestigationId && row.id === highlightInvestigationId
              ? 'ops-row-highlight'
              : ''
          )}
          columns={[
            {
              title: 'Timestamp',
              dataIndex: 'queuedAt',
              width: 150,
              render: (v: string) => new Date(v).toLocaleString('pt-BR'),
            },
            { title: 'Título', dataIndex: 'title', ellipsis: true },
            {
              title: 'Aplicação',
              key: 'application',
              width: 100,
              render: (_: unknown, row) => incidentApplicationLabel(row),
            },
            {
              title: 'Origem',
              key: 'origin',
              width: 130,
              render: (_: unknown, row) => <Tag>{incidentOriginLabel(row)}</Tag>,
            },
            {
              title: 'Status',
              key: 'triageStatus',
              width: 120,
              render: (_: unknown, row) => {
                const triage = incidentTriageStatus(row.status)
                return (
                  <Tag color={triage === 'em_triagem' ? 'processing' : 'gold'}>
                    {incidentTriageLabel(triage)}
                  </Tag>
                )
              },
            },
            {
              title: 'ID',
              dataIndex: 'id',
              width: 100,
              render: (id: string) => <InvestigationIdTag investigationId={id} />,
            },
            {
              title: 'Ações',
              key: 'actions',
              width: 120,
              render: (_: unknown, row) => (
                <Space size={4} wrap>
                  {row.status === 'fix_proposed' && (
                    <Button
                      size="small"
                      type="primary"
                      loading={updatingId === row.id}
                      onClick={() => void markComplete(row.id)}
                    >
                      Revisado
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
          expandable={{
            expandedRowRender: (row) => (
              <div style={{ maxWidth: 720 }}>
                <Paragraph type="secondary">
                  Pipeline: {PIPELINE_STATUS_LABEL[row.status]} · Lane {LANE_LABEL[row.lane]} ·{' '}
                  {row.deploymentTier}
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
        />
      )}
    </OpsPanel>
  )
}

/** @deprecated use IncidentesPanel */
export const IssuesPanel = IncidentesPanel
