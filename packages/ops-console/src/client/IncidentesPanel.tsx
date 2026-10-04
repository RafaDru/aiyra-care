import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Empty,
  Input,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
  type TableProps,
} from 'antd'
import {
  CheckOutlined,
  LinkOutlined,
  RedoOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import {
  incidentApplicationLabel,
  incidentOriginLabel,
  incidentPipelineLabel,
  incidentPipelineTagColor,
} from './ch-incident-display.js'
import { InvestigationIdTag } from './components/InvestigationIdTag.js'
import { OpsReferenceCodeTag } from './components/OpsReferenceCodeTag.js'
import { OpsPanel } from './components/OpsPanel.js'
import { opsApi } from './api.js'
import {
  INCIDENT_BOARD_FILTER_LABELS,
  suggestIncidentBoardFilter,
  type IncidentBoardFilter,
} from './ch-incident-board-filter.js'
import {
  matchesOpsAnalysisQueueItem,
  parseOpsSearchInput,
} from './ch-ops-search.js'
import {
  DEFAULT_INCIDENT_TABLE_SORT,
  loadIncidentTableSort,
  persistIncidentTableSort,
  sortIncidentTableItems,
  type IncidentTableSortState,
} from './ch-incident-table-sort.js'
import type { IncidentDispatchHealth, OpsAnalysisQueueItem } from './ops.types.js'

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

const PRIORITY_LABEL: Record<OpsAnalysisQueueItem['priority'], string> = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
  critical: 'Crítica',
}

const BOARD_FILTERS: IncidentBoardFilter[] = [
  'needs_attention',
  'triaged',
  'resolved',
  'all_open',
]

/** Atualização automática da lista (PG ao vivo; sem SSE). */
const INCIDENT_LIST_POLL_MS = 15_000

function buildIncidentRefDeepLink(referenceCode: string): string {
  const params = new URLSearchParams()
  params.set('group', 'operacao')
  params.set('tab', 'incidentes')
  params.set('incidentRef', referenceCode)
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`
}

function buildInvestigationDeepLink(investigationId: string): string {
  const params = new URLSearchParams()
  params.set('group', 'operacao')
  params.set('tab', 'incidentes')
  params.set('investigationId', investigationId)
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`
}

function buildDefectDeepLink(defectId: string): string {
  const params = new URLSearchParams()
  params.set('group', 'operacao')
  params.set('tab', 'defeitos')
  params.set('defectId', defectId)
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`
}

export function IncidentesPanel({
  onRefresh,
  highlightInvestigationId,
  initialBoardFilter,
  initialSearch,
}: {
  onRefresh?: () => void
  highlightInvestigationId?: string | null
  initialBoardFilter?: IncidentBoardFilter
  initialSearch?: string
}) {
  const [items, setItems] = useState<OpsAnalysisQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [boardFilter, setBoardFilter] = useState<IncidentBoardFilter>(
    initialBoardFilter ?? 'needs_attention',
  )
  const [searchText, setSearchText] = useState(initialSearch ?? '')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([])
  const [dispatchHealth, setDispatchHealth] = useState<IncidentDispatchHealth | null>(null)
  const [tableSort, setTableSort] = useState<IncidentTableSortState>(() => loadIncidentTableSort())
  const highlightRef = useRef<string | null>(null)

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true)
    try {
      const [data, health] = await Promise.all([
        opsApi.analysisQueue({
          filter: boardFilter,
          ensureId: highlightInvestigationId ?? undefined,
        }),
        opsApi.incidentDispatchHealth(),
      ])
      setItems(data.items)
      setDispatchHealth(health)
    } catch (err) {
      if (!options?.silent) {
        message.error(err instanceof Error ? err.message : 'Falha ao carregar incidentes')
      }
    } finally {
      if (!options?.silent) setLoading(false)
    }
  }, [boardFilter, highlightInvestigationId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== 'visible') return
      void load({ silent: true })
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load({ silent: true })
    }
    document.addEventListener('visibilitychange', onVisible)
    const id = window.setInterval(tick, INCIDENT_LIST_POLL_MS)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(id)
    }
  }, [load])

  useEffect(() => {
    if (initialBoardFilter) setBoardFilter(initialBoardFilter)
  }, [initialBoardFilter])

  useEffect(() => {
    if (initialSearch) setSearchText(initialSearch)
  }, [initialSearch])

  useEffect(() => {
    if (!highlightInvestigationId) return
    let cancelled = false
    void opsApi
      .analysisQueueItem(highlightInvestigationId)
      .then(({ item }) => {
        if (cancelled) return
        setBoardFilter(suggestIncidentBoardFilter(item))
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [highlightInvestigationId])

  useEffect(() => {
    if (highlightInvestigationId) {
      setExpandedRowKeys((prev) =>
        prev.includes(highlightInvestigationId) ? prev : [...prev, highlightInvestigationId],
      )
    }
  }, [highlightInvestigationId])

  useEffect(() => {
    if (!highlightInvestigationId || loading) return
    if (highlightRef.current === highlightInvestigationId) return
    const row = document.querySelector(
      `[data-incident-row-id="${highlightInvestigationId}"]`,
    )
    if (row) {
      highlightRef.current = highlightInvestigationId
      row.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [highlightInvestigationId, loading, items])

  const parsedSearch = useMemo(() => parseOpsSearchInput(searchText), [searchText])
  const visibleItems = useMemo(() => {
    if (!parsedSearch) return items
    return items.filter((item) => matchesOpsAnalysisQueueItem(item, parsedSearch))
  }, [items, parsedSearch])

  const sortedItems = useMemo(
    () => sortIncidentTableItems(visibleItems, tableSort),
    [visibleItems, tableSort],
  )

  const handleTableChange: TableProps<OpsAnalysisQueueItem>['onChange'] = (
    _pagination,
    _filters,
    sorter,
  ) => {
    const single = Array.isArray(sorter) ? sorter[0] : sorter
    if (!single || !single.columnKey) return
    const next: IncidentTableSortState =
      single.order === null || single.order === undefined
        ? DEFAULT_INCIDENT_TABLE_SORT
        : {
            columnKey: String(single.columnKey),
            order: single.order,
          }
    setTableSort(next)
    persistIncidentTableSort(next)
  }

  const runSearch = async (raw: string) => {
    const parsed = parseOpsSearchInput(raw)
    if (!parsed) {
      setSearchText('')
      return
    }
    setSearchText(raw)
    if (parsed.kind === 'incident_ref') {
      try {
        const { item } = await opsApi.analysisQueueByRef(parsed.value)
        setBoardFilter(suggestIncidentBoardFilter(item))
        setItems([item])
        setExpandedRowKeys([item.id])
      } catch (err) {
        message.warning(err instanceof Error ? err.message : 'Incidente não encontrado')
      }
      return
    }
    if (parsed.kind === 'uuid_prefix') {
      try {
        const { items: found } = await opsApi.searchAnalysisQueue(parsed.value)
        if (found.length === 0) {
          message.info('Nenhum incidente para esse ID')
          return
        }
        const first = found[0]
        setBoardFilter(suggestIncidentBoardFilter(first))
        setItems(found)
        setExpandedRowKeys([first.id])
      } catch (err) {
        message.error(err instanceof Error ? err.message : 'Busca falhou')
      }
      return
    }
    try {
      const { items: found } = await opsApi.searchAnalysisQueue(parsed.value)
      setItems(found)
      if (found.length === 1) setExpandedRowKeys([found[0].id])
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Busca falhou')
    }
  }

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

  const retryDispatch = async (id: string) => {
    setUpdatingId(id)
    try {
      await opsApi.retryAnalysisQueueDispatch(id, { runTick: true })
      message.success('Nova tentativa de dispatch enfileirada')
      await load()
      await onRefresh?.()
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Falha ao reenfileirar')
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

  const dispatchHealthBanner = (() => {
    if (!dispatchHealth) return null
    const parts: string[] = []
    if (dispatchHealth.deadCount > 0) {
      parts.push(`${dispatchHealth.deadCount} dispatch(es) em dead`)
    }
    if (dispatchHealth.staleOpenWithoutOutboxCount > 0) {
      parts.push(
        `${dispatchHealth.staleOpenWithoutOutboxCount} aberto(s) >1h sem outbox`,
      )
    }
    if (dispatchHealth.anyWebhookMissing) {
      const missing: string[] = []
      if (!dispatchHealth.webhooks.developmentSupport.ready) missing.push('Dev')
      if (!dispatchHealth.webhooks.sreSupport.ready) missing.push('SRE')
      parts.push(`Webhook Cursor ausente (${missing.join(', ')})`)
    }
    if (parts.length === 0) return null
    return (
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 12 }}
        message="Saúde do dispatch de triagem"
        description={parts.join(' · ')}
      />
    )
  })()

  return (
    <OpsPanel
      title="Incidentes"
      description="Sinais cru até triagem — GET /api/analysis-queue (Postgres); lista atualiza a cada 15s e ao voltar à aba."
    >
      {dispatchHealthBanner}
      <Space wrap style={{ marginBottom: 12 }} align="center">
        {BOARD_FILTERS.map((f) => (
          <Button
            key={f}
            size="small"
            type={boardFilter === f ? 'primary' : 'default'}
            onClick={() => {
              setSearchText('')
              setBoardFilter(f)
            }}
          >
            {INCIDENT_BOARD_FILTER_LABELS[f]}
          </Button>
        ))}
      </Space>
      <Input.Search
        allowClear
        placeholder="INC-000001, título ou prefixo do UUID"
        style={{ maxWidth: 420, marginBottom: 12 }}
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        onSearch={(v) => void runSearch(v)}
      />
      {visibleItems.length === 0 && !loading ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nenhum incidente neste filtro" />
      ) : (
        <Table<OpsAnalysisQueueItem>
          className="ops-incidentes-table"
          size="small"
          rowKey="id"
          loading={loading}
          pagination={false}
          dataSource={sortedItems}
          onChange={handleTableChange}
          onRow={(row) => ({
            'data-incident-row-id': row.id,
          })}
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
                  <Text strong>Dispatch</Text>
                  {row.dispatch ? (
                    <>
                      {' '}
                      — outbox <Text code>{row.dispatch.status ?? '—'}</Text>
                      {row.dispatch.attemptCount > 0 && (
                        <> · tentativas {row.dispatch.attemptCount}</>
                      )}
                      {row.dispatch.forwardedAt && (
                        <>
                          {' '}
                          · encaminhado{' '}
                          {new Date(row.dispatch.forwardedAt).toLocaleString('pt-BR')}
                        </>
                      )}
                      {row.dispatch.lastError && (
                        <div>
                          <Text type="danger">{row.dispatch.lastError}</Text>
                        </div>
                      )}
                    </>
                  ) : (
                    <Text type="secondary"> — sem linha outbox</Text>
                  )}
                </Paragraph>
                <Paragraph>
                  <Text strong>Referência:</Text>{' '}
                  <OpsReferenceCodeTag code={row.referenceCode} />
                </Paragraph>
                {row.recurrenceOfReferenceCode && (
                  <Paragraph>
                    <Text strong>Reincidência de</Text>{' '}
                    <a href={buildIncidentRefDeepLink(row.recurrenceOfReferenceCode)}>
                      {row.recurrenceOfReferenceCode}
                    </a>
                  </Paragraph>
                )}
                {row.linkedDefects && row.linkedDefects.length > 0 && (
                  <Paragraph>
                    <Text strong>Defeito(s):</Text>{' '}
                    {row.linkedDefects.map((def) => (
                      <span key={def.id} style={{ marginRight: 8 }}>
                        <a href={buildDefectDeepLink(def.id)}>
                          <OpsReferenceCodeTag code={def.referenceCode} compact />
                        </a>
                        <Text type="secondary"> ({def.status})</Text>
                      </span>
                    ))}
                  </Paragraph>
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
              title: 'Ref',
              key: 'referenceCode',
              dataIndex: 'referenceCode',
              width: 108,
              align: 'center',
              sorter: true,
              sortOrder:
                tableSort.columnKey === 'referenceCode' ? tableSort.order : null,
              render: (code: string | null) => <OpsReferenceCodeTag code={code} compact />,
            },
            {
              title: 'Atualizado',
              key: 'updatedAt',
              dataIndex: 'updatedAt',
              width: 148,
              sorter: true,
              sortOrder: tableSort.columnKey === 'updatedAt' ? tableSort.order : null,
              render: (v: string, row) => (
                <Tooltip title={`Enfileirado: ${new Date(row.queuedAt).toLocaleString('pt-BR')}`}>
                  <span>{new Date(v).toLocaleString('pt-BR')}</span>
                </Tooltip>
              ),
            },
            {
              title: 'Título',
              key: 'title',
              dataIndex: 'title',
              ellipsis: { showTitle: true },
              sorter: true,
              sortOrder: tableSort.columnKey === 'title' ? tableSort.order : null,
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
              title: 'Prioridade',
              key: 'priority',
              dataIndex: 'priority',
              width: 92,
              align: 'center',
              sorter: true,
              sortOrder: tableSort.columnKey === 'priority' ? tableSort.order : null,
              render: (p: OpsAnalysisQueueItem['priority']) => PRIORITY_LABEL[p],
            },
            {
              title: 'Status',
              key: 'pipelineStatus',
              width: 120,
              align: 'center',
              sorter: true,
              sortOrder:
                tableSort.columnKey === 'pipelineStatus' ? tableSort.order : null,
              render: (_: unknown, row) => (
                <Tag color={incidentPipelineTagColor(row)}>{incidentPipelineLabel(row)}</Tag>
              ),
            },
            {
              title: 'Defeito',
              key: 'linkedDefects',
              width: 108,
              align: 'center',
              render: (_: unknown, row) => {
                const first = row.linkedDefects?.[0]
                if (!first) return <Text type="secondary">—</Text>
                return (
                  <a href={buildDefectDeepLink(first.id)} onClick={(e) => e.stopPropagation()}>
                    <OpsReferenceCodeTag code={first.referenceCode} compact />
                  </a>
                )
              },
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
              width: 168,
              align: 'center',
              render: (_: unknown, row) => (
                <Space size={0} wrap style={{ justifyContent: 'center' }}>
                  {row.incidentPipelineStatus === 'dispatch_failed' && (
                    <Popconfirm
                      title="Nova tentativa de dispatch?"
                      description="Reenfileira o webhook de triagem."
                      okText="Tentar de novo"
                      cancelText="Cancelar"
                      onConfirm={() => retryDispatch(row.id)}
                    >
                      <Tooltip title="Nova tentativa">
                        <Button
                          type="text"
                          size="small"
                          icon={<RedoOutlined />}
                          aria-label="Nova tentativa"
                          loading={updatingId === row.id}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Tooltip>
                    </Popconfirm>
                  )}
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
