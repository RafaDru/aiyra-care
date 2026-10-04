import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
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
} from './ch-defect-display.js'
import { OpsPanel } from './components/OpsPanel.js'
import { OpsReferenceCodeTag } from './components/OpsReferenceCodeTag.js'
import { opsApi } from './api.js'
import { matchesPlatformDefectItem, parseOpsSearchInput } from './ch-ops-search.js'
import type { PlatformDefectItem, PlatformDefectStatus } from './ops.types.js'

const { Text, Paragraph, Link } = Typography

const FILTER_STATUSES: Array<PlatformDefectStatus | 'all'> = [
  'all',
  'open',
  'in_fix',
  'ready_for_pr',
  'fixed',
]

function buildDefectDeepLink(defectId: string): string {
  const params = new URLSearchParams()
  params.set('group', 'operacao')
  params.set('tab', 'defeitos')
  params.set('defectId', defectId)
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`
}

function buildIncidentDeepLink(incidentId: string): string {
  const params = new URLSearchParams()
  params.set('group', 'operacao')
  params.set('tab', 'incidentes')
  params.set('investigationId', incidentId)
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`
}

export function DefeitosPanel({
  onRefresh,
  highlightDefectId,
}: {
  onRefresh?: () => void
  highlightDefectId?: string | null
}) {
  const [items, setItems] = useState<PlatformDefectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<PlatformDefectStatus | 'all'>('all')
  const [searchText, setSearchText] = useState('')
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([])
  const highlightRef = useRef<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [batchConfig, setBatchConfig] = useState<{
    intervalMs: number
    readyCount: number
    nextWindowAt: string
  } | null>(null)
  const [batchRunning, setBatchRunning] = useState(false)
  const [branchDraft, setBranchDraft] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const includeFixed = statusFilter === 'all' || statusFilter === 'fixed'
      const statusParam =
        statusFilter === 'all' ? 'open,in_fix,ready_for_pr,fixed' : statusFilter
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

  useEffect(() => {
    if (!highlightDefectId || loading) return
    if (highlightRef.current === highlightDefectId) return
    const row = document.querySelector(`[data-defect-row-id="${highlightDefectId}"]`)
    if (row) {
      highlightRef.current = highlightDefectId
      row.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [highlightDefectId, loading, items])

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

  const openDetail = async (id: string) => {
    setExpandedRowKeys((prev) => (prev.includes(id) ? prev : [...prev, id]))
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

  const startFix = async (id: string, retry = false) => {
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
  }

  const markReadyForPr = (id: string) => {
    const branchName = branchDraft[id]?.trim()
    return runAction(
      id,
      () =>
        opsApi.patchPlatformDefectStatus(id, {
          status: 'ready_for_pr',
          branchName: branchName || undefined,
        }),
      'Marcado pronto para PR',
    )
  }

  const markFixed = (id: string) =>
    runAction(
      id,
      () => opsApi.patchPlatformDefectStatus(id, { status: 'fixed', skipBatch: true }),
      'Defeito marcado como corrigido',
    )

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

      <Space wrap style={{ marginBottom: 12 }}>
        {FILTER_STATUSES.map((s) => (
          <Button
            key={s}
            size="small"
            type={statusFilter === s ? 'primary' : 'default'}
            onClick={() => setStatusFilter(s)}
          >
            {s === 'all' ? 'Todos' : defectStatusLabel(s)}
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
          onRow={(row) => ({ 'data-defect-row-id': row.id })}
          rowClassName={(row) =>
            highlightDefectId && row.id === highlightDefectId ? 'ops-row-highlight' : ''
          }
          expandable={{
            expandedRowKeys,
            onExpandedRowsChange: (keys) => setExpandedRowKeys(keys.map(String)),
            expandedRowRender: (row) => (
              <DefeitoDetail
                defectId={row.id}
                row={row}
                branchValue={branchDraft[row.id] ?? row.branchName ?? ''}
                onBranchChange={(v) => setBranchDraft((prev) => ({ ...prev, [row.id]: v }))}
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
                  <OpsReferenceCodeTag code={row.referenceCode} compact />
                  <Tooltip title={row.id}>
                    <Text code style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                      {defectShortTag(row.id)}
                    </Text>
                  </Tooltip>
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
                      onClick={() => void openDetail(row.id)}
                    />
                  </Tooltip>
                  {row.status === 'open' && (
                    <Button
                      type="link"
                      size="small"
                      loading={updatingId === row.id}
                      onClick={() => void startFix(row.id)}
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
                        onClick={() => void startFix(row.id, true)}
                      >
                        Reenfileirar correção
                      </Button>
                      <Button
                        type="link"
                        size="small"
                        icon={<PullRequestOutlined />}
                        loading={updatingId === row.id}
                        onClick={() => void markReadyForPr(row.id)}
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
                      onClick={() => void markFixed(row.id)}
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
}: {
  defectId: string
  row: PlatformDefectItem
  branchValue: string
  onBranchChange: (value: string) => void
}) {
  const [incidents, setIncidents] = useState<Array<{ id: string; title: string }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void opsApi
      .platformDefectDetail(defectId)
      .then((d) => {
        if (!cancelled) setIncidents(d.incidents)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [defectId])

  const failure = row.lastCorrectionFailureDetails
  const showFailureBanner = defectHasCorrectionFailure(row)

  return (
    <div style={{ maxWidth: 720 }}>
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
        <OpsReferenceCodeTag code={row.referenceCode} />{' '}
        <Text code>{defectShortTag(row.id)}</Text>
      </Paragraph>
      {defectIsRecurrence(row) && (
        <Paragraph>
          <Text strong>Reincidência de:</Text>{' '}
          {row.parentReferenceCode ? (
            <OpsReferenceCodeTag code={row.parentReferenceCode} />
          ) : (
            <Text code>{defectShortTag(row.parentDefectId!)}</Text>
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
        <Text strong>Incidentes vinculados:</Text>{' '}
        {loading ? '…' : incidents.length === 0 ? '—' : null}
      </Paragraph>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {incidents.map((inc) => (
          <li key={inc.id}>
            <a href={buildIncidentDeepLink(inc.id)}>{inc.title}</a>
            <Text type="secondary"> · {inc.id.slice(0, 8)}</Text>
          </li>
        ))}
      </ul>
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
    </div>
  )
}
