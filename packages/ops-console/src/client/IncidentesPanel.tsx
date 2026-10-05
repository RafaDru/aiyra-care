import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Empty,
  Input,
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
  INCIDENT_PRIORITY_LABEL,
} from './ch-incident-display.js'
import {
  buildDefectDeepLink,
  buildIncidentRefDeepLink,
  buildInvestigationDeepLink,
} from './ch-ops-deep-link.js'
import { InvestigationIdTag } from './components/InvestigationIdTag.js'
import { OpsReferenceCodeTag } from './components/OpsReferenceCodeTag.js'
import { ChCopyableRefTag } from './components/ChCopyableRefTag.js'
import { ChLiveIndicator } from './components/ChLiveIndicator.js'
import { ChIncidentDetailBody } from './components/ChIncidentDetailBody.js'
import { OpsPanel } from './components/OpsPanel.js'
import { confirmTransactionalAction } from './ch-transactional-confirm.js'
import { useIncidentBoardStream } from './hooks/useIncidentBoardStream.js'
import { inferOpsReferenceHref } from './ch-ops-deep-link.js'
import type { OpsDeploymentTier } from './theme/ops-environment.js'
import { opsApi } from './api.js'
import {
  INCIDENT_BOARD_FILTER_LABELS,
  suggestIncidentBoardFilter,
  type IncidentBoardFilter,
} from './ch-incident-board-filter.js'
import { incidentMatchesBoardFilter } from './ch-incident-board-filter.js'
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

const { Text } = Typography

const BOARD_FILTERS: IncidentBoardFilter[] = [
  'all_open',
  'needs_attention',
  'triaged',
  'resolved',
]

export function IncidentesPanel({
  onRefresh,
  highlightInvestigationId,
  initialBoardFilter,
  initialSearch,
  deploymentTier = 'integration',
}: {
  onRefresh?: () => void
  highlightInvestigationId?: string | null
  initialBoardFilter?: IncidentBoardFilter
  initialSearch?: string
  deploymentTier?: OpsDeploymentTier
}) {
  const [items, setItems] = useState<OpsAnalysisQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [boardFilter, setBoardFilter] = useState<IncidentBoardFilter>(
    initialBoardFilter ?? 'all_open',
  )
  const [searchText, setSearchText] = useState(initialSearch ?? '')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([])
  const [dispatchHealth, setDispatchHealth] = useState<IncidentDispatchHealth | null>(null)
  const [tableSort, setTableSort] = useState<IncidentTableSortState>(() => loadIncidentTableSort())
  const highlightRow = useMemo(
    () => new URLSearchParams(window.location.search).get('highlight') === '1',
    [],
  )

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

  const { connection } = useIncidentBoardStream({
    deploymentTier,
    boardFilter,
    onPatch: setItems,
    onReload: () => load({ silent: true }),
  })

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

  const parsedSearch = useMemo(() => parseOpsSearchInput(searchText), [searchText])
  const visibleItems = useMemo(() => {
    const highlightId = highlightInvestigationId?.trim() || null
    const inFilter = items.filter((item) =>
      incidentMatchesBoardFilter(
        {
          status: item.status,
          incidentPipelineStatus: item.incidentPipelineStatus ?? 'open',
        },
        boardFilter,
      ),
    )
    if (!parsedSearch) return inFilter
    return inFilter.filter((item) => matchesOpsAnalysisQueueItem(item, parsedSearch))
  }, [items, parsedSearch, boardFilter, highlightInvestigationId])

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

  const markComplete = (id: string) => {
    confirmTransactionalAction('incident.mark_complete', async () => {
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
    })
  }

  const retryDispatch = (id: string) => {
    confirmTransactionalAction('incident.retry_dispatch', async () => {
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
    })
  }

  const toggleExpanded = (id: string) => {
    setExpandedRowKeys((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id],
    )
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
      description="Sinais cru até triagem — atualização em tempo real (SSE)."
    >
      {dispatchHealthBanner}
      <Space wrap style={{ marginBottom: 12 }} align="center">
        <ChLiveIndicator state={connection} />
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
            onClick: (e) => {
              if ((e.target as HTMLElement).closest('[data-ch-no-row-toggle]')) return
              if ((e.target as HTMLElement).closest('button, a, .ant-btn')) return
              toggleExpanded(row.id)
            },
            style: { cursor: 'pointer' },
          })}
          rowClassName={(row) =>
            highlightRow && highlightInvestigationId && row.id === highlightInvestigationId
              ? 'ops-row-highlight'
              : ''
          }
          expandable={{
            expandedRowKeys,
            onExpandedRowsChange: (keys) => setExpandedRowKeys(keys.map(String)),
            expandedRowRender: (row) => <ChIncidentDetailBody row={row} />,
            expandRowByClick: false,
          }}
          columns={[
            {
              title: 'Ref',
              key: 'referenceCode',
              dataIndex: 'referenceCode',
              width: 200,
              align: 'center',
              sorter: true,
              sortOrder:
                tableSort.columnKey === 'referenceCode' ? tableSort.order : null,
              render: (_: unknown, row) => (
                <Space size={4} wrap style={{ justifyContent: 'center' }}>
                  {row.referenceCode ? (
                    <ChCopyableRefTag
                      code={row.referenceCode}
                      href={inferOpsReferenceHref(row.referenceCode)}
                      compact
                    />
                  ) : (
                    <Text type="secondary">—</Text>
                  )}
                  <InvestigationIdTag investigationId={row.id} compact />
                </Space>
              ),
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
              render: (p: OpsAnalysisQueueItem['priority']) => INCIDENT_PRIORITY_LABEL[p],
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
                    <OpsReferenceCodeTag code={first.referenceCode} compact navigateOnClick={false} />
                  </a>
                )
              },
            },
            {
              title: 'Ações',
              key: 'actions',
              width: 168,
              align: 'center',
              render: (_: unknown, row) => (
                <Space size={0} wrap style={{ justifyContent: 'center' }}>
                  {row.incidentPipelineStatus === 'dispatch_failed' && (
                    <Tooltip title="Nova tentativa">
                      <Button
                        type="text"
                        size="small"
                        icon={<RedoOutlined />}
                        aria-label="Nova tentativa"
                        loading={updatingId === row.id}
                        data-ch-no-row-toggle
                        onClick={(e) => {
                          e.stopPropagation()
                          retryDispatch(row.id)
                        }}
                      />
                    </Tooltip>
                  )}
                  <Tooltip title="Abrir detalhe">
                    <Button
                      type="text"
                      size="small"
                      icon={<UnorderedListOutlined />}
                      aria-label="Detalhe"
                      data-ch-no-row-toggle
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleExpanded(row.id)
                      }}
                    />
                  </Tooltip>
                  <Tooltip title="Copiar link do incidente">
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
