import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Empty,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd'
import {
  PlayCircleOutlined,
  PullRequestOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import {
  defectFixedViaHint,
  defectReadyForPrCount,
  defectShortTag,
  defectHasCorrectionFailure,
  defectIsRecurrence,
  defectStatusColor,
  defectStatusLabel,
  formatBatchWindowHours,
  humanizeDefectReviewField,
} from './ch-defect-display.js'
import {
  buildDefectCycleSteps,
  defectPipelineCiRowBadge,
  defectPipelineReviewRowBadge,
  defectPipelineStatusRowBadge,
  defectReviewCiStatusBadge,
  defectShowCiFailureBanner,
  defectShowReviewFailureBanner,
  formatCiFailureSummary,
  humanizeDefectPipelineStatus,
} from './ch-pipeline-display.js'
import { ChPipelineTimeline } from './components/ChPipelineTimeline.js'
import {
  DEFECT_BOARD_FILTER_LABELS,
  DEFECT_OPEN_STATUS_LIST,
  type DefectBoardStatusFilter,
} from './ch-defect-board-filter.js'
import { ChCopyableRefTag } from './components/ChCopyableRefTag.js'
import { ChDetailSection } from './components/ChDetailSection.js'
import { ChLiveIndicator } from './components/ChLiveIndicator.js'
import { confirmTransactionalAction } from './ch-transactional-confirm.js'
import { useDefectBoardStream } from './hooks/useDefectBoardStream.js'
import type { OpsDeploymentTier } from './theme/ops-environment.js'
import { inferOpsReferenceHref } from './ch-ops-deep-link.js'

import {
  buildDefectDeepLink,
  buildInvestigationDeepLink,
} from './ch-ops-deep-link.js'
import { OpsPanel } from './components/OpsPanel.js'
import { OpsReferenceCodeTag } from './components/OpsReferenceCodeTag.js'
import { InvestigationIdTag } from './components/InvestigationIdTag.js'
import { opsApi } from './api.js'
import { matchesPlatformDefectItem, parseOpsSearchInput } from './ch-ops-search.js'
import type {
  DefectPrReviewSummary,
  PlatformDefectItem,
  PlatformDefectStatus,
} from './ops.types.js'

const { Text, Paragraph, Link } = Typography

const FILTER_STATUSES: DefectBoardStatusFilter[] = [
  'all_open',
  'open',
  'in_fix',
  'ready_for_pr',
  'fixed',
  'all',
]

export function DefeitosPanel({
  onRefresh,
  highlightDefectId,
  deploymentTier = 'integration',
}: {
  onRefresh?: () => void
  highlightDefectId?: string | null
  deploymentTier?: OpsDeploymentTier
}) {
  const [items, setItems] = useState<PlatformDefectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<DefectBoardStatusFilter>('all_open')
  const [searchText, setSearchText] = useState('')
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([])
  const highlightRow = useMemo(
    () => new URLSearchParams(window.location.search).get('highlight') === '1',
    [],
  )
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [batchConfig, setBatchConfig] = useState<{
    intervalMs: number
    readyCount: number
    nextWindowAt: string
  } | null>(null)
  const [batchRunning, setBatchRunning] = useState(false)
  const [branchDraft, setBranchDraft] = useState<Record<string, string>>({})
  const [chG3RequireReviewApprove, setChG3RequireReviewApprove] = useState(false)

  useEffect(() => {
    void opsApi.health().then((health) => {
      setChG3RequireReviewApprove(health.chG3RequireReviewApprove === true)
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const includeFixed = statusFilter === 'all' || statusFilter === 'fixed'
      const statusParam =
        statusFilter === 'all_open'
          ? DEFECT_OPEN_STATUS_LIST
          : statusFilter === 'all'
            ? 'open,in_fix,ready_for_pr,fixed'
            : statusFilter
      const [defects, config] = await Promise.all([
        opsApi.platformDefects({ status: statusParam, includeFixed }),
        opsApi.defectPrBatchConfig().catch(() => null),
      ])
      setItems(defects.items)
      if (config) setBatchConfig(config)
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Falha ao carregar defeitos')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    void load()
  }, [load])

  const { connection } = useDefectBoardStream({
    deploymentTier,
    statusFilter,
    onPatch: setItems,
    onReload: () => load(),
  })

  useEffect(() => {
    if (!highlightDefectId) return
    setExpandedRowKeys((prev) =>
      prev.includes(highlightDefectId) ? prev : [...prev, highlightDefectId],
    )
    void opsApi
      .platformDefectDetail(highlightDefectId)
      .then((d) => {
        setItems((prev) => {
          if (prev.some((x) => x.id === d.defect.id)) return prev
          return [d.defect, ...prev]
        })
      })
      .catch(() => undefined)
  }, [highlightDefectId])

  const parsedSearch = useMemo(() => parseOpsSearchInput(searchText), [searchText])
  const visibleItems = useMemo(() => {
    if (!parsedSearch) return items
    return items.filter((item) => matchesPlatformDefectItem(item, parsedSearch))
  }, [items, parsedSearch])

  const runSearch = async (raw: string) => {
    const parsed = parseOpsSearchInput(raw)
    if (!parsed) {
      setSearchText('')
      return
    }
    setSearchText(raw)
    if (parsed.kind === 'defect_ref') {
      try {
        const { item } = await opsApi.platformDefectByRef(parsed.value)
        setStatusFilter('all')
        setItems([item])
        setExpandedRowKeys([item.id])
      } catch (err) {
        message.warning(err instanceof Error ? err.message : 'Defeito não encontrado')
      }
      return
    }
    try {
      const { items: found } = await opsApi.platformDefects({ q: parsed.value })
      if (found.length === 0) {
        message.info('Nenhum defeito encontrado')
        return
      }
      setStatusFilter('all')
      setItems(found)
      if (found.length === 1) setExpandedRowKeys([found[0].id])
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Busca falhou')
    }
  }

  const readyCount = useMemo(() => defectReadyForPrCount(items), [items])
  const displayReady = batchConfig?.readyCount ?? readyCount

  const runBatch = async () => {
    setBatchRunning(true)
    try {
      const result = await opsApi.runDefectPrBatch()
      if (result.count === 0) {
        message.info('Nenhum defeito ready_for_pr sem lote')
      } else {
        message.success(`Lote ${result.batch?.id?.slice(0, 8) ?? ''} — ${result.count} defeito(s)`)
      }
      await load()
      await onRefresh?.()
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Falha ao rodar lote')
    } finally {
      setBatchRunning(false)
    }
  }

  const runAction = async (id: string, fn: () => Promise<unknown>, okMsg: string) => {
    setUpdatingId(id)
    try {
      await fn()
      message.success(okMsg)
      await load()
      await onRefresh?.()
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Falha na ação')
    } finally {
      setUpdatingId(null)
    }
  }

  const startFix = (id: string, retry = false) => {
    confirmTransactionalAction(retry ? 'defect.requeue_fix' : 'defect.start_fix', async () => {
      setUpdatingId(id)
      try {
        const res = await opsApi.startPlatformDefectFix(id)
        if (res.ok) {
          message.success(retry ? 'Correção reenfileirada' : 'Correção iniciada')
        } else {
          const detail =
            res.dispatch?.outcome === 'skipped'
              ? 'Dispatch ignorado — verifique webhook Correção Dev no .env'
              : res.dispatch?.error ?? 'Dispatch não aceito'
          message.warning(detail)
        }
        await load()
        await onRefresh?.()
      } catch (err) {
        message.error(err instanceof Error ? err.message : 'Falha na ação')
      } finally {
        setUpdatingId(null)
      }
    })
  }

  const markReadyForPr = (id: string) => {
    const branchName = branchDraft[id]?.trim()
    confirmTransactionalAction('defect.mark_ready_pr', () =>
      runAction(
        id,
        () =>
          opsApi.patchPlatformDefectStatus(id, {
            status: 'ready_for_pr',
            branchName: branchName || undefined,
          }),
        'Marcado pronto para PR',
      ),
    )
  }

  const markFixed = (id: string, prUrl?: string | null) => {
    confirmTransactionalAction(
      'defect.mark_fixed',
      () =>
        runAction(
          id,
          () => opsApi.patchPlatformDefectStatus(id, { status: 'fixed', skipBatch: true }),
          'Defeito marcado como corrigido',
        ),
      prUrl ? 'Há PR aberto neste defeito.' : undefined,
    )
  }

  const toggleExpanded = (id: string) => {
    setExpandedRowKeys((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id],
    )
  }

  return (
    <OpsPanel
      title="Defeitos"
      description="Registros pós-triagem — GET /api/platform-defects (Postgres platform_defects)."
    >
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Text>
            <Text strong>{displayReady}</Text> prontos para PR
          </Text>
          {batchConfig && (
            <Text type="secondary">
              · próximo lote em {formatBatchWindowHours(batchConfig.intervalMs)} (
              {new Date(batchConfig.nextWindowAt).toLocaleString('pt-BR')})
            </Text>
          )}
          <Tooltip title="Agrupa defeitos ready_for_pr sem pr_batch_id">
            <Button
              size="small"
              type="primary"
              ghost
              icon={<PlayCircleOutlined />}
              loading={batchRunning}
              disabled={displayReady === 0}
              onClick={() => void runBatch()}
            >
              Rodar lote agora
            </Button>
          </Tooltip>
        </Space>
      </Card>

      <Input.Search
        allowClear
        placeholder="DEF-000001, título ou prefixo do UUID"
        style={{ maxWidth: 420, marginBottom: 12 }}
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        onSearch={(v) => void runSearch(v)}
      />

      <Space wrap style={{ marginBottom: 12 }} align="center">
        <ChLiveIndicator state={connection} />
        {FILTER_STATUSES.map((s) => (
          <Button
            key={s}
            size="small"
            type={statusFilter === s ? 'primary' : 'default'}
            onClick={() => setStatusFilter(s)}
          >
            {DEFECT_BOARD_FILTER_LABELS[s]}
          </Button>
        ))}
      </Space>

      {visibleItems.length === 0 && !loading ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nenhum defeito neste filtro" />
      ) : (
        <Table<PlatformDefectItem>
          size="small"
          rowKey="id"
          loading={loading}
          pagination={false}
          dataSource={visibleItems}
          onRow={(row) => ({
            'data-defect-row-id': row.id,
            onClick: (e) => {
              if ((e.target as HTMLElement).closest('[data-ch-no-row-toggle]')) return
              if ((e.target as HTMLElement).closest('button, a, .ant-btn')) return
              toggleExpanded(row.id)
            },
            style: { cursor: 'pointer' },
          })}
          rowClassName={(row) =>
            highlightRow && highlightDefectId && row.id === highlightDefectId
              ? 'ops-row-highlight'
              : ''
          }
          expandable={{
            expandRowByClick: false,
            expandedRowKeys,
            onExpandedRowsChange: (keys) => setExpandedRowKeys(keys.map(String)),
            expandedRowRender: (row) => (
              <DefeitoDetail
                defectId={row.id}
                row={row}
                branchValue={branchDraft[row.id] ?? row.branchName ?? ''}
                onBranchChange={(v) => setBranchDraft((prev) => ({ ...prev, [row.id]: v }))}
                onDefectUpdated={(defect) => {
                  setItems((prev) =>
                    prev.map((x) => (x.id === defect.id ? { ...x, ...defect } : x)),
                  )
                }}
                onReload={load}
                chG3RequireReviewApprove={chG3RequireReviewApprove}
              />
            ),
          }}
          columns={[
            {
              title: 'Ref',
              key: 'ref',
              width: 200,
              align: 'center',
              render: (_: unknown, row) => (
                <Space size={4} wrap style={{ justifyContent: 'center' }}>
                  {row.referenceCode ? (
                    <ChCopyableRefTag
                      code={row.referenceCode}
                      href={inferOpsReferenceHref(row.referenceCode)}
                      compact
                    />
                  ) : null}
                  <ChCopyableRefTag
                    code={defectShortTag(row.id)}
                    href={buildDefectDeepLink(row.id)}
                    compact
                  />
                </Space>
              ),
            },
            {
              title: 'Título',
              dataIndex: 'title',
              ellipsis: true,
            },
            {
              title: 'Desde',
              dataIndex: 'firstSeenAt',
              width: 148,
              render: (v: string) => new Date(v).toLocaleString('pt-BR'),
            },
            {
              title: 'Incidentes',
              dataIndex: 'incidentCount',
              width: 88,
              align: 'center',
              render: (n: number | undefined) => n ?? 0,
            },
            {
              title: 'Status',
              dataIndex: 'status',
              width: 130,
              align: 'center',
              render: (s: PlatformDefectStatus, row) => (
                <Space size={4} wrap style={{ justifyContent: 'center' }}>
                  <Tag color={defectStatusColor(s)}>{defectStatusLabel(s)}</Tag>
                  {defectIsRecurrence(row) && (
                    <Tooltip
                      title={
                        row.parentReferenceCode
                          ? `Reincidência de ${row.parentReferenceCode}`
                          : 'Reincidência de defeito corrigido'
                      }
                    >
                      <Tag color="magenta">Reincidência</Tag>
                    </Tooltip>
                  )}
                  {defectHasCorrectionFailure(row) && (
                    <Tag color="error">Falha correção</Tag>
                  )}
                  {(() => {
                    const ciBadge = defectPipelineCiRowBadge(row)
                    const reviewBadge = defectPipelineReviewRowBadge(row)
                    const pipelineBadge = defectPipelineStatusRowBadge(row)
                    return (
                      <>
                        {ciBadge ? <Tag color={ciBadge.color}>{ciBadge.label}</Tag> : null}
                        {reviewBadge ? (
                          <Tag color={reviewBadge.color}>{reviewBadge.label}</Tag>
                        ) : null}
                        {pipelineBadge ? (
                          <Tag color={pipelineBadge.color}>{pipelineBadge.label}</Tag>
                        ) : null}
                      </>
                    )
                  })()}
                </Space>
              ),
            },
            {
              title: 'Ações',
              key: 'actions',
              width: 160,
              align: 'center',
              render: (_: unknown, row) => (
                <Space size={0} wrap>
                  <Tooltip title="Detalhe">
                    <Button
                      type="text"
                      size="small"
                      icon={<UnorderedListOutlined />}
                      data-ch-no-row-toggle
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleExpanded(row.id)
                      }}
                    />
                  </Tooltip>
                  {row.status === 'open' && (
                    <Button
                      type="link"
                      size="small"
                      loading={updatingId === row.id}
                      data-ch-no-row-toggle
                      onClick={(e) => {
                        e.stopPropagation()
                        void startFix(row.id)
                      }}
                    >
                      Iniciar correção
                    </Button>
                  )}
                  {row.status === 'in_fix' && (
                    <>
                      <Button
                        type="link"
                        size="small"
                        loading={updatingId === row.id}
                        data-ch-no-row-toggle
                        onClick={(e) => {
                          e.stopPropagation()
                          void startFix(row.id, true)
                        }}
                      >
                        Reenfileirar correção
                      </Button>
                      <Button
                        type="link"
                        size="small"
                        icon={<PullRequestOutlined />}
                        loading={updatingId === row.id}
                        data-ch-no-row-toggle
                        onClick={(e) => {
                          e.stopPropagation()
                          void markReadyForPr(row.id)
                        }}
                      >
                        Marcar pronto p/ PR
                      </Button>
                    </>
                  )}
                  {row.status === 'ready_for_pr' && (
                    <Button
                      type="link"
                      size="small"
                      loading={updatingId === row.id}
                      data-ch-no-row-toggle
                      onClick={(e) => {
                        e.stopPropagation()
                        void markFixed(row.id, row.prUrl)
                      }}
                    >
                      Corrigido
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      )}

      {items.some((d) => d.status === 'in_fix') && (
        <Paragraph type="secondary" style={{ marginTop: 12 }}>
          Branch (opcional) antes de «Pronto PR»: edite no detalhe expandido.
        </Paragraph>
      )}
    </OpsPanel>
  )
}

function DefeitoDetail({
  defectId,
  row,
  branchValue,
  onBranchChange,
  onDefectUpdated,
  onReload,
  chG3RequireReviewApprove,
}: {
  defectId: string
  row: PlatformDefectItem
  branchValue: string
  onBranchChange: (value: string) => void
  onDefectUpdated: (defect: PlatformDefectItem) => void
  onReload: () => Promise<void>
  chG3RequireReviewApprove: boolean
}) {
  const [incidents, setIncidents] = useState<
    Array<{ id: string; title: string; referenceCode: string | null }>
  >([])
  const [loading, setLoading] = useState(true)
  const [reviewBusy, setReviewBusy] = useState(false)

  const refreshDetail = useCallback(async () => {
    const d = await opsApi.platformDefectDetail(defectId)
    setIncidents(d.incidents)
    onDefectUpdated(d.defect)
    return d.defect
  }, [defectId, onDefectUpdated])

  useEffect(() => {
    let cancelled = false
    void refreshDetail()
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refreshDetail])

  const failure = row.lastCorrectionFailureDetails
  const showFailureBanner = defectHasCorrectionFailure(row)
  const showCiFailureBanner = defectShowCiFailureBanner(row)
  const showReviewFailureBanner = defectShowReviewFailureBanner(row)
  const ciFailureSummary = formatCiFailureSummary(row)
  const pipelineSteps = buildDefectCycleSteps(row)

  return (
    <div style={{ maxWidth: 720 }}>
      <ChPipelineTimeline steps={pipelineSteps} />
      {showCiFailureBanner && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          message="CI falhou na branch do PR"
          description={
            <div>
              {ciFailureSummary && <div>{ciFailureSummary}</div>}
              {row.lastCiRunUrl && (
                <Link href={row.lastCiRunUrl} target="_blank" rel="noreferrer">
                  Abrir GitHub Actions
                </Link>
              )}
              {row.lastFailureKind === 'ci' && (
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">Última falha: ci</Text>
                </div>
              )}
            </div>
          }
        />
      )}
      {showReviewFailureBanner && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="Revisão agêntica pediu ajustes"
          description={
            row.pipelineStatus === 'review_failed'
              ? humanizeDefectPipelineStatus(row.pipelineStatus)
              : row.latestReview?.recommendationRationale
          }
        />
      )}
      {showFailureBanner && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          message="Correção Dev falhou — defeito reaberto"
          description={
            <div>
              {row.lastFailureSummary && <div>{row.lastFailureSummary}</div>}
              {failure?.blockedReason && (
                <div style={{ marginTop: 4 }}>
                  <Text type="secondary">Bloqueio:</Text> {failure.blockedReason}
                </div>
              )}
              <Space size={8} wrap style={{ marginTop: 8 }}>
                {failure?.runUrl && (
                  <Link href={failure.runUrl} target="_blank" rel="noreferrer">Run / logs</Link>
                )}
                {failure?.logUrl && (
                  <Link href={failure.logUrl} target="_blank" rel="noreferrer">Log</Link>
                )}
                {failure?.artifactPath && <Text code>{failure.artifactPath}</Text>}
              </Space>
              {row.correctionFailedAt && (
                <div style={{ marginTop: 6 }}>
                  <Text type="secondary">
                    Registrado em {new Date(row.correctionFailedAt).toLocaleString('pt-BR')}
                  </Text>
                </div>
              )}
            </div>
          }
        />
      )}
      <Paragraph>
        <Text strong>Referência:</Text>{' '}
        <OpsReferenceCodeTag code={row.referenceCode} showCopy />{' '}
        <Tooltip title="Abrir por UUID">
          <a
            href={buildDefectDeepLink(row.id)}
            style={{ fontFamily: 'monospace', fontSize: 11, color: 'inherit' }}
          >
            {defectShortTag(row.id)}
          </a>
        </Tooltip>
      </Paragraph>
      {defectIsRecurrence(row) && (
        <Paragraph>
          <Text strong>Reincidência de:</Text>{' '}
          {row.parentReferenceCode ? (
            <OpsReferenceCodeTag code={row.parentReferenceCode} showCopy />
          ) : (
            <OpsReferenceCodeTag
              code={defectShortTag(row.parentDefectId!)}
              href={buildDefectDeepLink(row.parentDefectId!)}
              showCopy
            />
          )}{' '}
          <Link href={buildDefectDeepLink(row.parentDefectId!)}>Abrir DEF pai</Link>
        </Paragraph>
      )}
      {row.triageSummary && (
        <Paragraph>
          <Text strong>Triagem:</Text> {row.triageSummary}
        </Paragraph>
      )}
      {row.triageArtifactPath && (
        <Paragraph>
          <Text strong>Artefato:</Text> <Text code>{row.triageArtifactPath}</Text>
        </Paragraph>
      )}
      {row.branchName && (
        <Paragraph>
          <Text strong>Branch:</Text> <Text code>{row.branchName}</Text>
        </Paragraph>
      )}
      {row.prUrl && (
        <Paragraph>
          <Text strong>PR:</Text>{' '}
          <Link href={row.prUrl} target="_blank" rel="noreferrer">{row.prUrl}</Link>
        </Paragraph>
      )}
      {row.mergedPrUrl && row.mergedPrUrl !== row.prUrl && (
        <Paragraph>
          <Text strong>PR mergeado:</Text>{' '}
          <Link href={row.mergedPrUrl} target="_blank" rel="noreferrer">{row.mergedPrUrl}</Link>
        </Paragraph>
      )}
      {row.status === 'fixed' && defectFixedViaHint(row.fixedVia) && (
        <Paragraph type="secondary">{defectFixedViaHint(row.fixedVia)}</Paragraph>
      )}
      <Paragraph>
        <Text strong>Incidentes vinculados</Text>
      </Paragraph>
      {loading ? (
        <Text type="secondary">Carregando…</Text>
      ) : incidents.length === 0 ? (
        <Text type="secondary">Nenhum incidente vinculado ainda.</Text>
      ) : (
        <ul style={{ margin: '0 0 8px', paddingLeft: 18, listStyle: 'none' }}>
          {incidents.map((inc) => (
            <li key={inc.id} style={{ marginBottom: 6 }}>
              <Space size={6} wrap align="start">
                {inc.referenceCode ? (
                  <OpsReferenceCodeTag code={inc.referenceCode} compact />
                ) : null}
                <Link href={buildInvestigationDeepLink(inc.id)}>{inc.title}</Link>
                <InvestigationIdTag investigationId={inc.id} compact />
              </Space>
            </li>
          ))}
        </ul>
      )}
      {row.status === 'in_fix' && (
        <Paragraph style={{ marginTop: 8 }}>
          <Text type="secondary">Branch para PR:</Text>
          <Input
            size="small"
            style={{ marginTop: 4, maxWidth: 360 }}
            placeholder="cursor/fix-wallet-sync"
            value={branchValue}
            onChange={(e) => onBranchChange(e.target.value)}
          />
        </Paragraph>
      )}
      {row.status === 'ready_for_pr' && !row.prUrl && (
        <DefeitoRegisterPrCard
          defectId={defectId}
          onRegistered={async (defect) => {
            onDefectUpdated(defect)
            await onReload()
          }}
        />
      )}
      <DefeitoAgenticReviewCard
        row={row}
        busy={reviewBusy}
        chG3RequireReviewApprove={chG3RequireReviewApprove}
        onApprove={async (body) => {
          setReviewBusy(true)
          try {
            const res = await opsApi.operatorApprovePlatformDefectPr(defectId, body)
            message.success(res.message)
            if (res.prUrl) window.open(res.prUrl, '_blank', 'noopener,noreferrer')
            await refreshDetail()
            await onReload()
          } catch (err) {
            message.error(err instanceof Error ? err.message : 'Falha ao registrar aprovação')
          } finally {
            setReviewBusy(false)
          }
        }}
        onRequestChanges={() => {
          confirmTransactionalAction('defect.request_changes', async () => {
            setReviewBusy(true)
            try {
              await opsApi.operatorRequestChangesPlatformDefectPr(defectId)
              message.success('Mudanças solicitadas — defeito reaberto para correção')
              await refreshDetail()
              await onReload()
            } catch (err) {
              message.error(err instanceof Error ? err.message : 'Falha ao pedir mudanças')
            } finally {
              setReviewBusy(false)
            }
          })
        }}
      />
    </div>
  )
}

function DefeitoRegisterPrCard({
  defectId,
  onRegistered,
}: {
  defectId: string
  onRegistered: (defect: PlatformDefectItem) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [prUrl, setPrUrl] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = () => {
    const trimmed = prUrl.trim()
    if (!trimmed) {
      message.warning('Informe a URL do PR GitHub')
      return
    }
    confirmTransactionalAction('defect.register_pr', async () => {
      setBusy(true)
      try {
        const res = await opsApi.registerPlatformDefectPr(defectId, trimmed)
        message.success('PR registrado')
        setOpen(false)
        setPrUrl('')
        await onRegistered(res.item)
      } catch (err) {
        message.error(err instanceof Error ? err.message : 'Falha ao registrar PR')
      } finally {
        setBusy(false)
      }
    })
  }

  return (
    <Alert
      type="warning"
      showIcon
      style={{ marginBottom: 12 }}
      message="PR GitHub ausente"
      description={
        <Space direction="vertical" size={8}>
          <Text type="secondary">
            Registre o pull request para habilitar review agêntica e aprovação G3.
          </Text>
          <Button type="primary" size="small" onClick={() => setOpen(true)}>
            Registrar PR
          </Button>
          <Modal
            title="Registrar PR GitHub"
            open={open}
            okText="Registrar"
            cancelText="Cancelar"
            confirmLoading={busy}
            onCancel={() => setOpen(false)}
            onOk={() => submit()}
          >
            <Input
              placeholder="https://github.com/RafaDru/aiyra-care/pull/123"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
            />
          </Modal>
        </Space>
      }
    />
  )
}

function reviewRecommendationColor(
  rec: DefectPrReviewSummary['recommendation'],
): string {
  if (rec === 'approve') return 'success'
  if (rec === 'request_changes') return 'warning'
  if (rec === 'block') return 'error'
  return 'default'
}

function riskLevelColor(level: DefectPrReviewSummary['riskLevel']): string {
  if (!level || level === 'nulo') return 'default'
  if (level === 'baixo') return 'green'
  if (level === 'medio') return 'gold'
  if (level === 'alto') return 'orange'
  return 'red'
}

function DefeitoAgenticReviewCard({
  row,
  busy,
  chG3RequireReviewApprove,
  onApprove,
  onRequestChanges,
}: {
  row: PlatformDefectItem
  busy: boolean
  chG3RequireReviewApprove: boolean
  onApprove: (body?: { override?: boolean; overrideReason?: string }) => Promise<void>
  onRequestChanges: () => void
}) {
  const review = row.latestReview
  const showActions = row.status === 'ready_for_pr' && Boolean(row.prUrl)
  const [overrideApprove, setOverrideApprove] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')

  useEffect(() => {
    setOverrideApprove(false)
    setOverrideReason('')
  }, [row.id, review?.id, review?.status, review?.recommendation])

  const reviewBlocksApprove =
    chG3RequireReviewApprove
    && (!review || review.status !== 'completed' || review.recommendation !== 'approve')
  const canApprove = !reviewBlocksApprove || (overrideApprove && overrideReason.trim().length > 0)
  const reviewCiBadge = defectReviewCiStatusBadge(review)

  return (
    <Card size="small" title="Revisão agêntica" style={{ marginTop: 16 }}>
      {!review ? (
        <Text type="secondary">
          {showActions
            ? 'Revisão agêntica dispara automaticamente ao ficar pronto para PR.'
            : 'Nenhuma revisão agêntica registrada.'}
        </Text>
      ) : (
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <Space wrap>
            <Tag>{humanizeDefectReviewField(review.status)}</Tag>
            {review.recommendation && (
              <Tag color={reviewRecommendationColor(review.recommendation)}>
                {humanizeDefectReviewField(review.recommendation)}
              </Tag>
            )}
            {reviewCiBadge && (
              <Tag color={reviewCiBadge.color}>{reviewCiBadge.label}</Tag>
            )}
            {review.completedAt && (
              <Text type="secondary">
                {new Date(review.completedAt).toLocaleString('pt-BR')}
              </Text>
            )}
          </Space>
          {review.correctionEffectiveness && (
            <div>
              <Text strong>Eficácia:</Text>{' '}
              <Tag>{humanizeDefectReviewField(review.correctionEffectiveness)}</Tag>
            </div>
          )}
          {review.riskLevel && (
            <div>
              <Text strong>Risco:</Text>{' '}
              <Tag color={riskLevelColor(review.riskLevel)}>
                {humanizeDefectReviewField(review.riskLevel)}
              </Tag>
              {review.riskSummary && <Text> — {review.riskSummary}</Text>}
            </div>
          )}
          {review.securityVerdict && (
            <div>
              <Text strong>Segurança:</Text>{' '}
              <Tag>{humanizeDefectReviewField(review.securityVerdict)}</Tag>
              {review.securitySummary && <Text> — {review.securitySummary}</Text>}
            </div>
          )}
          {review.recommendationRationale && (
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {review.recommendationRationale}
            </Paragraph>
          )}
          <Space wrap>
            {review.prReviewCommentUrl && (
              <Link href={review.prReviewCommentUrl} target="_blank" rel="noreferrer">
                Comentário no PR
              </Link>
            )}
            {review.agentRunUrl && (
              <Link href={review.agentRunUrl} target="_blank" rel="noreferrer">
                Run do agente
              </Link>
            )}
          </Space>
        </Space>
      )}
      {showActions && reviewBlocksApprove && (
        <Space direction="vertical" size={8} style={{ marginTop: 12, width: '100%' }}>
          <Checkbox
            checked={overrideApprove}
            onChange={(e) => setOverrideApprove(e.target.checked)}
          >
            Override sem review «Aprovar merge» (auditável)
          </Checkbox>
          {overrideApprove && (
            <Input.TextArea
              rows={2}
              placeholder="Motivo do override (obrigatório)"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
            />
          )}
        </Space>
      )}
      {showActions && (
        <Space wrap style={{ marginTop: 12 }}>
          <Button href={row.prUrl!} target="_blank" rel="noreferrer">
            Abrir PR
          </Button>
          <Button
            loading={busy}
            disabled={!canApprove}
            onClick={() => {
              confirmTransactionalAction('defect.approve_merge', () =>
                onApprove(
                  reviewBlocksApprove && overrideApprove
                    ? { override: true, overrideReason: overrideReason.trim() }
                    : undefined,
                ),
              )
            }}
          >
            Aprovar para merge
          </Button>
          <Button danger loading={busy} onClick={() => void onRequestChanges()}>
            Pedir mudanças
          </Button>
        </Space>
      )}
      {row.operatorPrApprovedAt && (
        <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          Aprovação operador em {new Date(row.operatorPrApprovedAt).toLocaleString('pt-BR')}
          {row.operatorPrApprovedNote ? ` — ${row.operatorPrApprovedNote}` : ''}
        </Paragraph>
      )}
    </Card>
  )
}
