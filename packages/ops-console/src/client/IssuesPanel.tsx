import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Empty, Space, Table, Tag, Typography, message } from 'antd'
import { OpsPanel } from './components/OpsPanel.js'
import { opsApi } from './api.js'
import type { OpsAnalysisQueueItem } from './ops.types.js'

const { Text, Paragraph } = Typography

const STATUS_LABEL: Record<OpsAnalysisQueueItem['status'], string> = {
  queued: 'Na fila',
  investigating: 'Investigando',
  fix_proposed: 'Solução proposta',
  completed: 'Concluída',
  dismissed: 'Descartada',
  failed: 'Falhou',
}

const STATUS_COLOR: Record<OpsAnalysisQueueItem['status'], string> = {
  queued: 'gold',
  investigating: 'processing',
  fix_proposed: 'success',
  completed: 'default',
  dismissed: 'default',
  failed: 'error',
}

const LANE_LABEL: Record<OpsAnalysisQueueItem['lane'], string> = {
  development_support: 'Suporte ao Desenvolvimento',
  sre_support: 'Suporte SRE',
}

export function IssuesPanel({ onRefresh }: { onRefresh?: () => void }) {
  const [items, setItems] = useState<OpsAnalysisQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await opsApi.analysisQueue()
      setItems(data.items)
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Falha ao carregar issues')
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
      message.success('Issue marcada como concluída')
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
      title="Issues"
      description="Pilha unificada — Suporte ao Desenvolvimento e Suporte SRE. Callback do agente preenche «Solução proposta»."
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="Ciclo"
        description="queued → investigating → fix_proposed (agente) → completed (você revisa)."
      />
      {items.length === 0 && !loading ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nenhuma issue aberta" />
      ) : (
        <Table<OpsAnalysisQueueItem>
          size="small"
          rowKey="id"
          loading={loading}
          pagination={false}
          dataSource={items}
          columns={[
            {
              title: 'Lane',
              dataIndex: 'lane',
              width: 200,
              render: (lane: OpsAnalysisQueueItem['lane']) => (
                <Tag>{LANE_LABEL[lane]}</Tag>
              ),
            },
            {
              title: 'Status',
              dataIndex: 'status',
              width: 130,
              render: (s: OpsAnalysisQueueItem['status']) => (
                <Tag color={STATUS_COLOR[s]}>{STATUS_LABEL[s]}</Tag>
              ),
            },
            { title: 'Título', dataIndex: 'title', ellipsis: true },
            {
              title: 'Ambiente',
              dataIndex: 'deploymentTier',
              width: 100,
              render: (t: string) => <Text code>{t}</Text>,
            },
            {
              title: 'Erro / contexto',
              key: 'error',
              width: 180,
              ellipsis: true,
              render: (_: unknown, row) => row.errorSummary ?? '—',
            },
            {
              title: 'Ações',
              key: 'actions',
              width: 140,
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
                {row.analysisLastError && (
                  <Paragraph type="danger">{row.analysisLastError}</Paragraph>
                )}
                <Text type="secondary">
                  {row.sourceType} · {row.sourceId.slice(0, 12)}… · {row.lane}
                </Text>
              </div>
            ),
          }}
        />
      )}
    </OpsPanel>
  )
}
