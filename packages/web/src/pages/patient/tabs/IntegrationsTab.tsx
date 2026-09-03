import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react'
import {
  Typography, Button, Space, Tag, Modal, Form, Input, App, Alert, Table, Dropdown, Tooltip,
} from 'antd'
import type { MenuProps } from 'antd'
import {
  SyncOutlined, DeleteOutlined, EditOutlined, CloudDownloadOutlined,
  PlusOutlined, MoreOutlined, QrcodeOutlined,
} from '@ant-design/icons'
import { api } from '../../../lib/api.js'
import type { Patient, IntegrationLink, GovBrSessionView } from '../../../lib/api.types.js'
import type { IntegrationLinkSyncStatus } from '../../../lib/api.types.js'
import { BrandCoverageOperator } from '../../../components/brands/BrandCoverageOperator.js'
import { brandOrFallback } from '../../../components/brands/brand-config.js'
import { coverageBrandRowVars } from '../../../components/brands/coverage-brand-surface.js'
import '../../../components/brands/brand-tint-table.css'
import { NewIntegrationModal } from '../../../components/integrations/NewIntegrationModal.js'
import { PublicHealthIntegrationModal } from '../../../components/integrations/PublicHealthIntegrationModal.js'
import type { PublicHealthPortal, LinkablePortal } from '../../../components/integrations/integration-catalog.js'
import {
  formatSyncNovelty,
  collectSyncTargets,
  isSyncablePortal,
  isLinkSessionReady,
} from '../../../lib/silent-sync.js'
import type { WalletDockJob } from '../../../components/scraper/WalletSyncDock.js'
import { IntegrationsSyncSidebar } from '../../../components/integrations/IntegrationsSyncSidebar.js'
import { GroupedAlignedTables } from '../../../components/layout/GroupedAlignedTables.js'
import { DismissibleHint } from '../../../components/ui/DismissibleHint.js'
import { SessionStatusTag } from '../../../components/ui/StatusTag.js'
import { isHintDismissed } from '../../../lib/dismissed-hints.js'
import { ALIGNED_COL } from '../../../components/layout/aligned-table-columns.js'
import { useIntegrationSyncHistory } from '../../../hooks/useIntegrationSyncHistory.js'
import type { SyncablePortalType } from '../../../lib/sync-portal-profile.js'
import type { SyncJobOverallStatus } from '../../../lib/sync-job-progress.js'
import { useAuth } from '../../../contexts/AuthContext.js'
import {
  INSURANCE_PORTALS,
  HOSPITAL_PORTALS,
  LABORATORY_PORTALS,
  noveltySummary,
} from './wallet-shared.js'

const { Text, Title } = Typography

type PortalKey = LinkablePortal

interface Props {
  patient: Patient
  links: IntegrationLink[]
  onRemoved: () => void
  onLinkPortal: (portal: PortalKey) => void
  onCardUpdated: () => void
  linkedChildrenCount?: number
}

export interface IntegrationsTabHandle {
  syncAll: () => void
  syncTargetCount: number
}

type TableRow = {
  key: string
  kind: 'link' | 'public'
  portalType: string
  label: string
  link?: IntegrationLink
  publicPortal?: PublicHealthPortal
  syncLinkId?: string
  group: 'health' | 'hospital' | 'laboratory' | 'public'
}

function LinkSyncStatusCell({ linkId, hidden, pausePolling }: { linkId: string; hidden?: boolean; pausePolling?: boolean }) {
  const [status, setStatus] = useState<IntegrationLinkSyncStatus | null>(null)
  const { loading: authLoading, authUserId, configured: authConfigured } = useAuth()

  useEffect(() => {
    if (hidden || pausePolling) return
    if (authConfigured && (authLoading || !authUserId)) return
    let cancelled = false
    const poll = () => {
      api.integrationLinks.syncStatus(linkId)
        .then((s) => { if (!cancelled) setStatus(s) })
        .catch(() => {})
    }
    poll()
    const id = window.setInterval(poll, 15000)
    return () => { cancelled = true; window.clearInterval(id) }
  }, [linkId, hidden, pausePolling, authLoading, authUserId, authConfigured])

  if (hidden) return <Text type="secondary">—</Text>

  const active = status?.activeJob
  const last = status?.lastJob

  if (active) {
    const started = active.startedAt
      ? new Date(active.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : null
    return (
      <Space size={4}>
        <SyncOutlined spin style={{ color: '#1677ff' }} />
        <Text style={{ fontSize: 12 }}>
          {started ? `${started} · ` : ''}{active.message || 'Em andamento'}
        </Text>
      </Space>
    )
  }

  if (!last) return <Text type="secondary">Nunca</Text>

  const when = last.finishedAt
    ? new Date(last.finishedAt).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    : '—'

  if (last.status === 'failed') {
    return (
      <Tooltip title={last.error || last.message}>
        <Tag color="error">Falhou · {when}</Tag>
      </Tooltip>
    )
  }

  const novelty = last.novelty ?? last.result?.novelty
  const noveltyText = noveltySummary(novelty) || formatSyncNovelty(novelty)

  return (
    <Space size={4} wrap>
      <Tag color={noveltyText ? 'success' : 'default'}>{when}</Tag>
      {noveltyText && <Text type="secondary" style={{ fontSize: 11 }}>{noveltyText}</Text>}
    </Space>
  )
}

export const IntegrationsTab = forwardRef<IntegrationsTabHandle, Props>(function IntegrationsTab({
  patient,
  links,
  onRemoved,
  onLinkPortal,
  onCardUpdated,
  linkedChildrenCount = 0,
}, ref) {
  const { message } = App.useApp()
  const { loading: authLoading, configured: authConfigured } = useAuth()
  const [dockJobs, setDockJobs] = useState<WalletDockJob[]>([])
  const [startingLinkIds, setStartingLinkIds] = useState<Set<string>>(new Set())
  const [syncAllBusy, setSyncAllBusy] = useState(false)
  const terminalHandledRef = useRef<Set<string>>(new Set())
  const [editLink, setEditLink] = useState<IntegrationLink | null>(null)
  const [savingCard, setSavingCard] = useState(false)
  const [form] = Form.useForm()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [publicHealthPortal, setPublicHealthPortal] = useState<PublicHealthPortal | null>(null)
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)
  const [govbrSession, setGovbrSession] = useState<GovBrSessionView | null>(null)

  useEffect(() => {
    if (authConfigured && authLoading) return
    api.account.govbrSession()
      .then(setGovbrSession)
      .catch(() => setGovbrSession(null))
  }, [authConfigured, authLoading, historyRefreshKey])

  const dockLinkIds = new Set(dockJobs.map((j) => j.linkId))
  const syncTargets = collectSyncTargets(links)
  const linkedPortals = new Set(links.map((l) => l.portalType))
  const { groupedByDate, activeEntries } = useIntegrationSyncHistory(
    syncTargets,
    historyRefreshKey,
    dockJobs.length > 0,
  )

  const dockJobsRef = useRef(dockJobs)
  dockJobsRef.current = dockJobs
  const startingLinkIdsRef = useRef(startingLinkIds)
  startingLinkIdsRef.current = startingLinkIds

  const isLinkSyncing = (linkId: string) =>
    dockLinkIds.has(linkId) || startingLinkIds.has(linkId)

  const startManualSync = useCallback(async (
    linkId: string,
    portalType: string,
    opts?: { force?: boolean },
  ) => {
    if (!isSyncablePortal(portalType)) return
    if (
      dockJobsRef.current.some((j) => j.linkId === linkId)
      || startingLinkIdsRef.current.has(linkId)
    ) {
      return
    }
    setStartingLinkIds((prev) => new Set(prev).add(linkId))
    try {
      const r = await api.integrationLinks.sync(linkId, { force: opts?.force })
      if (r.skipped) {
        if (r.reason === 'session_required') {
          message.info('Primeira conexão ou sessão expirada — Sincronizar pode abrir o portal')
        }
        return
      }
      if (r.jobId) {
        setDockJobs((prev) => [
          ...prev,
          { jobId: r.jobId!, linkId, portalType: portalType as SyncablePortalType },
        ])
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Erro na sincronização')
    } finally {
      setStartingLinkIds((prev) => {
        const next = new Set(prev)
        next.delete(linkId)
        return next
      })
    }
  }, [message])

  const syncAll = useCallback(async () => {
    if (syncTargets.length === 0) {
      message.info('Vincule Unimed, Amil ou Mater Dei em Nova integração')
      return
    }
    if (syncAllBusy || dockJobsRef.current.length > 0) return
    setSyncAllBusy(true)
    try {
      for (const link of syncTargets) {
        const syncLinkId = link.effectiveSyncLinkId ?? link.id
        await startManualSync(syncLinkId, link.portalType, { force: true })
      }
    } finally {
      setSyncAllBusy(false)
    }
  }, [message, syncAllBusy, syncTargets, startManualSync])

  useImperativeHandle(ref, () => ({
    syncAll: () => { void syncAll() },
    syncTargetCount: syncTargets.length,
  }), [syncAll, syncTargets.length])

  const handleDockJobTerminal = useCallback((jobId: string, status: SyncJobOverallStatus) => {
    if (terminalHandledRef.current.has(jobId)) return
    terminalHandledRef.current.add(jobId)
    const delay = status === 'failed' ? 5000 : 2500
    window.setTimeout(() => {
      setDockJobs((prev) => {
        const next = prev.filter((j) => j.jobId !== jobId)
        if (next.length === 0) {
          onCardUpdated()
          setHistoryRefreshKey((k) => k + 1)
        }
        return next
      })
      terminalHandledRef.current.delete(jobId)
    }, delay)
  }, [onCardUpdated])

  const openPublicHealth = (portal: PublicHealthPortal) => {
    setPickerOpen(false)
    setPublicHealthPortal(portal)
  }

  const saveCardNumber = async () => {
    if (!editLink) return
    try {
      const values = await form.validateFields()
      setSavingCard(true)
      await api.integrationLinks.update(editLink.id, {
        cardNumber: values.cardNumber?.replace(/\s/g, '') || undefined,
      })
      message.success('Carteirinha atualizada')
      setEditLink(null)
      onCardUpdated()
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      message.error(err instanceof Error ? err.message : 'Erro ao atualizar carteirinha')
    } finally {
      setSavingCard(false)
    }
  }

  const removeLink = async (link: IntegrationLink) => {
    try {
      await api.integrationLinks.delete(link.id)
      message.success('Vínculo removido')
      onRemoved()
    } catch {
      message.error('Erro ao remover vínculo')
    }
  }

  const buildRows = (): TableRow[] => {
    const rows: TableRow[] = []
    for (const link of links) {
      const meta = brandOrFallback(link.portalType)
      const group = INSURANCE_PORTALS.has(link.portalType) ? 'health' as const
        : HOSPITAL_PORTALS.has(link.portalType) ? 'hospital' as const
          : LABORATORY_PORTALS.has(link.portalType) ? 'laboratory' as const
            : 'health' as const
      rows.push({
        key: link.id,
        kind: 'link',
        portalType: link.portalType,
        label: link.portalType === 'hermes_pardini' ? meta.shortLabel : meta.label,
        link,
        syncLinkId: link.effectiveSyncLinkId ?? link.id,
        group,
      })
    }
    rows.push({
      key: 'conectesus',
      kind: 'public',
      portalType: 'conectesus',
      label: 'ConecteSUS',
      publicPortal: 'conectesus',
      group: 'public',
    })
    if (patient.ageCategory === 'children' || patient.ageCategory === 'adolescents' || linkedChildrenCount > 0) {
      rows.push({
        key: 'caderneta',
        kind: 'public',
        portalType: 'caderneta',
        label: 'Caderneta da Criança',
        publicPortal: 'caderneta',
        group: 'public',
      })
    }
    return rows
  }

  const rows = buildRows()
  const groupTitle: Record<TableRow['group'], string> = {
    health: 'Plano de saúde',
    hospital: 'Hospitais e clínicas',
    laboratory: 'Laboratórios',
    public: 'Sistema público (gov.br)',
  }

  const integrationColumns: Parameters<typeof Table<TableRow>>[0]['columns'] = [
    {
      title: 'Portal',
      key: 'portal',
      width: ALIGNED_COL.portal,
      render: (_, row) => (
        <div>
          <BrandCoverageOperator brand={row.portalType} logoSize="default">
            {row.label}
          </BrandCoverageOperator>
          {row.portalType === 'hermes_pardini' && (
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2, paddingLeft: 2 }}>
              Pardini · Fleury · a+ · Labs a+
            </Text>
          )}
          {row.link?.authAttention === 'credentials' && (
            <Text type="danger" style={{ fontSize: 11, display: 'block', marginTop: 4, paddingLeft: 2 }}>
              Atualize a senha em Editar credenciais
            </Text>
          )}
          {row.link?.authAttention === 'session' && (
            <Text type="warning" style={{ fontSize: 11, display: 'block', marginTop: 4, paddingLeft: 2 }}>
              Sincronize novamente para reconectar
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Sessão',
      key: 'session',
      width: ALIGNED_COL.session,
      render: (_, row) => {
        if (row.kind === 'public') {
          if (row.publicPortal === 'conectesus') {
            return govbrSession?.sessionReady
              ? <SessionStatusTag ready />
              : <Tag>gov.br pendente</Tag>
          }
          return govbrSession?.sessionReady
            ? <SessionStatusTag ready />
            : <Tag>gov.br</Tag>
        }
        const link = row.link!
        if (!isSyncablePortal(link.portalType)) {
          return <Tag>Vínculo manual</Tag>
        }
        return isLinkSessionReady(link)
          ? <SessionStatusTag ready />
          : <SessionStatusTag ready={false} />
      },
    },
    {
      title: 'Última sincronização',
      key: 'lastSync',
      width: ALIGNED_COL.lastSync,
      render: (_, row) => {
        if (row.kind === 'public') {
          if (govbrSession?.conectesusLastFetchAt) {
            const d = new Date(govbrSession.conectesusLastFetchAt)
            return <Text type="secondary">Última busca {d.toLocaleDateString('pt-BR')}</Text>
          }
          return <Text type="secondary">Importação guiada (gov.br)</Text>
        }
        const syncId = row.syncLinkId!
        return (
          <LinkSyncStatusCell
            linkId={syncId}
            hidden={dockLinkIds.has(syncId)}
            pausePolling={dockJobs.length > 0}
          />
        )
      },
    },
    {
      title: 'Ações',
      key: 'actions',
      width: ALIGNED_COL.actions,
      render: (_, row) => {
        if (row.kind === 'public') {
          return (
            <Button
              size="small"
              icon={<CloudDownloadOutlined />}
              onClick={() => openPublicHealth(row.publicPortal!)}
            >
              {row.publicPortal === 'conectesus'
                ? (patient.cns ? 'Atualizar' : 'Importar')
                : 'Importar'}
            </Button>
          )
        }
        const link = row.link!
        const syncLinkId = row.syncLinkId!
        const managedByTitular = link.syncAuthority === 'titular' && syncLinkId !== link.id
        const titularName = link.managedByPatientName?.split(' ')[0] ?? 'titular'

        const menuItems: MenuProps['items'] = [
          INSURANCE_PORTALS.has(link.portalType) && {
            key: 'card',
            icon: <EditOutlined />,
            label: 'Nº carteirinha',
            onClick: () => {
              setEditLink(link)
              form.setFieldsValue({ cardNumber: link.cardNumber || '' })
            },
          },
          link.portalType === 'unimed' && {
            key: 'qr',
            icon: <QrcodeOutlined />,
            label: 'QR na Carteira',
            onClick: () => message.info('Abra a aba Carteira para QR / Token Unimed'),
          },
          {
            key: 'remove',
            icon: <DeleteOutlined />,
            label: 'Remover vínculo',
            danger: true,
            onClick: () => removeLink(link),
          },
        ].filter(Boolean) as MenuProps['items']

        return (
          <Space size={4} wrap>
            <Button
              size="small"
              icon={<SyncOutlined />}
              loading={isLinkSyncing(syncLinkId)}
              disabled={!isSyncablePortal(link.portalType)}
              onClick={() => startManualSync(syncLinkId, link.portalType, { force: true })}
            >
              {managedByTitular ? `Via ${titularName}` : 'Sincronizar'}
            </Button>
            <Dropdown menu={{ items: menuItems }} trigger={['click']}>
              <Button size="small" icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        )
      },
    },
  ]

  const integrationOnRow = (row: TableRow) => ({
    className: 'brand-tint-row',
    style: coverageBrandRowVars(row.portalType),
  })

  const integrationGroups: Array<{
    key: TableRow['group']
    title: string
    data: TableRow[]
  }> = [
    { key: 'health', title: groupTitle.health, data: rows.filter((r) => r.group === 'health') },
    { key: 'hospital', title: groupTitle.hospital, data: rows.filter((r) => r.group === 'hospital') },
    { key: 'laboratory', title: groupTitle.laboratory, data: rows.filter((r) => r.group === 'laboratory') },
    { key: 'public', title: groupTitle.public, data: rows.filter((r) => r.group === 'public') },
  ]

  const firstName = patient.name.split(' ')[0]

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 20,
            padding: '14px 16px',
            borderRadius: 12,
            border: '1px solid var(--border, #e5e7eb)',
            background: 'var(--card-bg, #fff)',
          }}
        >
          <div>
            <Title level={5} style={{ marginBottom: 2 }}>Integrações de {firstName}</Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {syncTargets.length > 0
                ? `${syncTargets.length} integração(ões) com sincronização automática`
                : 'Conecte portais e importe dados do SUS'}
            </Text>
          </div>
          <Space wrap>
            <Tooltip title={syncTargets.length === 0 ? 'Vincule um portal primeiro' : 'Sincronizar todas em paralelo'}>
              <Button
                type="primary"
                icon={<SyncOutlined />}
                loading={syncAllBusy || dockJobs.length > 0}
                onClick={() => void syncAll()}
                id="wallet-sync-all"
              >
                Sincronizar tudo
              </Button>
            </Tooltip>
            <Button icon={<PlusOutlined />} onClick={() => setPickerOpen(true)}>
              Nova integração
            </Button>
          </Space>
        </div>

        {rows.length === 0 ? (
          isHintDismissed('integrations.empty') ? (
            <Typography.Text type="secondary">Nenhuma integração — use Nova integração para vincular um portal.</Typography.Text>
          ) : (
            <DismissibleHint
              hintId="integrations.empty"
              type="info"
              showIcon
              message="Nenhuma integração"
              description="Use Nova integração para vincular Unimed, Amil, Mater Dei ou importar do gov.br."
            />
          )
        ) : (
          <GroupedAlignedTables<TableRow>
            groups={integrationGroups}
            columns={integrationColumns}
            rowKey="key"
            hideEmptyGroups
            onRow={integrationOnRow}
          />
        )}

        <NewIntegrationModal
          open={pickerOpen}
          linkedPortals={linkedPortals}
          onClose={() => setPickerOpen(false)}
          onLinkPortal={onLinkPortal}
          onImportConectesus={() => openPublicHealth('conectesus')}
          onImportCaderneta={() => openPublicHealth('caderneta')}
        />

        <PublicHealthIntegrationModal
          open={publicHealthPortal != null}
          portal={publicHealthPortal}
          patientId={patient.id}
          linkedChildrenCount={linkedChildrenCount}
          onClose={() => setPublicHealthPortal(null)}
          onImported={() => {
            onCardUpdated()
            setHistoryRefreshKey((k) => k + 1)
          }}
        />

        <Modal
          title="Número da carteirinha"
          open={!!editLink}
          onOk={saveCardNumber}
          confirmLoading={savingCard}
          onCancel={() => setEditLink(null)}
          okText="Salvar"
          cancelText="Cancelar"
        >
          <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
            <Form.Item name="cardNumber" label="Nº da carteirinha" rules={[{ required: true }]}>
              <Input placeholder="Ex: 094995656" />
            </Form.Item>
          </Form>
        </Modal>
      </div>

      <IntegrationsSyncSidebar
        dockJobs={dockJobs}
        groupedHistory={groupedByDate}
        activeHistory={activeEntries}
        onJobTerminal={handleDockJobTerminal}
      />
    </div>
  )
})
