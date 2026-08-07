import { useEffect, useState, type ReactNode } from 'react'
import {
  Typography, Button, Space, Tag, Empty, Modal, Form, Input, App, QRCode, Spin, Alert,
  Collapse, Descriptions, Divider,
} from 'antd'
import {
  SyncOutlined, DeleteOutlined, EditOutlined, CloudDownloadOutlined,
  QrcodeOutlined, PlusOutlined,
} from '@ant-design/icons'
import { api } from '../../../lib/api.js'
import type { Patient, IntegrationLink, UnimedVirtualCard, PlanMembershipWithPlan } from '../../../lib/api.types.js'
import type { IntegrationLinkSyncStatus, SyncNoveltySummary } from '../../../lib/api.types.js'
import { BrandLogo, BrandTag } from '../../../components/brands/BrandLogo.js'
import { brandOrFallback, type BrandKey } from '../../../components/brands/brand-config.js'
import { NewIntegrationModal } from '../../../components/integrations/NewIntegrationModal.js'
import { PublicHealthIntegrationModal } from '../../../components/integrations/PublicHealthIntegrationModal.js'
import type { PublicHealthPortal } from '../../../components/integrations/integration-catalog.js'
import type { LinkablePortal } from '../../../components/integrations/integration-catalog.js'

const { Text, Title } = Typography

type PortalKey = LinkablePortal

interface Props {
  patient: Patient
  links: IntegrationLink[]
  syncingId: string | null
  onSync: (linkId: string, portalType?: string) => void
  onRemoved: () => void
  onLinkPortal: (portal: PortalKey) => void
  onCardUpdated: () => void
  linkedChildrenCount?: number
}

const INSURANCE_PORTALS = new Set(['unimed', 'amil', 'bradesco_saude'])
const HOSPITAL_PORTALS = new Set(['mater_dei'])
const SYNCABLE = new Set(['unimed', 'amil', 'mater_dei'])

function noveltySummary(n: SyncNoveltySummary | null | undefined): string | null {
  if (!n) return null
  const parts: string[] = []
  if (n.newExamRecords != null && n.newExamRecords > 0) parts.push(`${n.newExamRecords} exame(s) novo(s)`)
  if (n.filesDownloaded != null && n.filesDownloaded > 0) parts.push(`${n.filesDownloaded} arquivo(s) baixado(s)`)
  if (n.skippedExamRecords != null && n.skippedExamRecords > 0 && !parts.length) {
    parts.push(`${n.skippedExamRecords} exame(s) já conhecidos`)
  }
  if (n.filesSkipped != null && n.filesSkipped > 0 && !parts.length) {
    parts.push(`${n.filesSkipped} arquivo(s) sem novidade`)
  }
  return parts.length ? parts.join(' · ') : 'Sem novidades no portal'
}

function IntegrationLinkSyncBanner({ linkId }: { linkId: string }) {
  const [status, setStatus] = useState<IntegrationLinkSyncStatus | null>(null)

  useEffect(() => {
    let cancelled = false
    const poll = () => {
      api.integrationLinks.syncStatus(linkId)
        .then((s) => { if (!cancelled) setStatus(s) })
        .catch(() => {})
    }
    poll()
    const id = window.setInterval(poll, 2500)
    return () => { cancelled = true; window.clearInterval(id) }
  }, [linkId])

  const active = status?.activeJob
  const last = status?.lastJob

  if (!active && !last) return null

  if (active) {
    return (
      <Alert
        type="info"
        showIcon
        icon={<SyncOutlined spin />}
        style={{ marginTop: 8, fontSize: 12 }}
        message="Sincronização em andamento"
        description={active.message || active.step || 'Processando...'}
      />
    )
  }

  if (!last) return null
  const novelty = last.novelty ?? last.result?.novelty
  const when = last.finishedAt
    ? new Date(last.finishedAt).toLocaleString('pt-BR')
    : null

  if (last.status === 'failed') {
    return (
      <Alert
        type="error"
        showIcon
        style={{ marginTop: 8, fontSize: 12 }}
        message={when ? `Última sync falhou (${when})` : 'Última sync falhou'}
        description={last.error || last.message || 'Erro desconhecido'}
      />
    )
  }

  return (
    <Alert
      type={novelty && (novelty.newExamRecords ?? 0) + (novelty.filesDownloaded ?? 0) > 0 ? 'success' : 'info'}
      showIcon
      style={{ marginTop: 8, fontSize: 12 }}
      message={when ? `Última sync (${when})` : 'Última sincronização'}
      description={noveltySummary(novelty)}
    />
  )
}

function formatCpf(cpf: string | null | undefined) {
  if (!cpf || cpf.length !== 11) return cpf || '—'
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`
}

function formatCns(cns: string | null | undefined) {
  if (!cns) return '—'
  const d = cns.replace(/\D/g, '')
  if (d.length !== 15) return cns
  return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7, 11)} ${d.slice(11)}`
}

function formatCardNumber(value: string | null | undefined) {
  if (!value) return null
  return value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim()
}

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function remainingSeconds(expiresAt: string | null | undefined): number {
  if (!expiresAt) return 0
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
}

function WalletCardFace({
  brandKey,
  planLabel,
  holderName,
  numberLabel,
  numberValue,
  extra,
}: {
  brandKey: BrandKey | string
  planLabel?: string
  holderName: string
  numberLabel: string
  numberValue: string
  extra?: ReactNode
}) {
  const meta = brandOrFallback(brandKey)
  return (
    <div
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        background: meta.gradient,
        color: '#fff',
        minHeight: 168,
        position: 'relative',
        boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
      }}
    >
      <div style={{ padding: '16px 18px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BrandLogo brand={brandKey} size={36} />
            <div>
              <Text style={{ color: meta.accent, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>
                {meta.subtitle}
              </Text>
              <div style={{ fontWeight: 700, fontSize: 17, lineHeight: 1.2 }}>{meta.label}</div>
              {planLabel && planLabel !== meta.subtitle && (
                <Text style={{ color: meta.accent, fontSize: 12 }}>{planLabel}</Text>
              )}
            </div>
          </div>
          {extra}
        </div>

        <div style={{ marginTop: 22 }}>
          <Text style={{ color: meta.accent, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' }}>
            {numberLabel}
          </Text>
          <div
            style={{
              fontFamily: 'ui-monospace, Consolas, monospace',
              fontSize: numberValue === '—' ? 15 : 20,
              fontWeight: 600,
              letterSpacing: numberValue === '—' ? 0 : 1.5,
              marginTop: 4,
              opacity: numberValue === '—' ? 0.7 : 1,
            }}
          >
            {numberValue}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <Text style={{ color: meta.accent, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' }}>
            Beneficiário
          </Text>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{holderName}</div>
        </div>
      </div>
    </div>
  )
}

function CardToolbar({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        padding: '10px 12px',
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderTop: 'none',
        borderRadius: '0 0 16px 16px',
        marginTop: -1,
      }}
    >
      {children}
    </div>
  )
}

function PlanDetailsCollapse({ memberships }: { memberships: PlanMembershipWithPlan[] }) {
  if (!memberships.length) return null

  return (
    <div>
      <Title level={5} style={{ marginBottom: 4 }}>Planos e coberturas</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
        Detalhes sincronizados dos operadores de saúde.
      </Text>
      <Collapse
        accordion
        items={memberships.map((m) => {
          const brand = m.plan?.operator ?? m.source ?? 'unimed'
          const meta = brandOrFallback(brand)
          const rows = [
            m.plan?.productCode && { label: 'Registro ANS', value: m.plan.productCode },
            m.plan?.networkName && { label: 'Rede', value: m.plan.networkName },
            m.plan?.segmentation && { label: 'Segmentação', value: m.plan.segmentation },
            m.plan?.accommodation && { label: 'Acomodação', value: m.plan.accommodation },
            m.plan?.geographicCoverage && { label: 'Abrangência', value: m.plan.geographicCoverage },
            m.plan?.regulationType && { label: 'Regulamentação', value: m.plan.regulationType },
            m.plan?.contractType && { label: 'Contratação', value: m.plan.contractType },
            m.plan?.contractorName && { label: 'Contratante', value: m.plan.contractorName },
            m.memberNumber && { label: 'Carteirinha', value: formatCardNumber(m.memberNumber) ?? m.memberNumber },
            m.cns && { label: 'CNS', value: formatCns(m.cns) },
            m.cardValidTo && {
              label: 'Validade',
              value: new Date(m.cardValidTo).toLocaleDateString('pt-BR'),
            },
          ].filter(Boolean) as Array<{ label: string; value: string }>

          return {
            key: m.id,
            label: (
              <Space wrap>
                <BrandTag brand={brand}>{meta.shortLabel}</BrandTag>
                <Text strong>{m.plan?.planName || 'Plano'}</Text>
                <Tag color={m.status === 'active' ? 'green' : 'default'}>
                  {m.role === 'dependent' ? 'Dependente' : 'Titular'}
                </Tag>
              </Space>
            ),
            children: (
              <div>
                {rows.length > 0 && (
                  <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }} style={{ marginBottom: 12 }}>
                    {rows.map((r) => (
                      <Descriptions.Item key={r.label} label={r.label}>{r.value}</Descriptions.Item>
                    ))}
                  </Descriptions>
                )}
                {!!m.plan?.addOns?.length && (
                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary">Aditivos: </Text>
                    {m.plan.addOns.map((a) => <Tag key={a.description}>{a.description}</Tag>)}
                  </div>
                )}
                {!!m.plan?.waitingPeriods?.length && (
                  <div>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Carências</Text>
                    {m.plan.waitingPeriods.map((w) => (
                      <Text key={`${w.description}-${w.endsAt}`} type="secondary" style={{ display: 'block', fontSize: 12 }}>
                        {w.group ? `${w.group}: ` : ''}{w.description}
                        {w.endsAt ? ` · até ${new Date(w.endsAt).toLocaleDateString('pt-BR')}` : ''}
                      </Text>
                    ))}
                  </div>
                )}
              </div>
            ),
          }
        })}
      />
    </div>
  )
}

export function WalletTab({
  patient, links, syncingId, onSync, onRemoved, onLinkPortal, onCardUpdated,
  linkedChildrenCount = 0,
}: Props) {
  const { message } = App.useApp()
  const [editLink, setEditLink] = useState<IntegrationLink | null>(null)
  const [savingCard, setSavingCard] = useState(false)
  const [form] = Form.useForm()
  const [tokenLink, setTokenLink] = useState<IntegrationLink | null>(null)
  const [virtualCard, setVirtualCard] = useState<UnimedVirtualCard | null>(null)
  const [loadingToken, setLoadingToken] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [memberships, setMemberships] = useState<PlanMembershipWithPlan[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [publicHealthPortal, setPublicHealthPortal] = useState<PublicHealthPortal | null>(null)

  const openPublicHealth = (portal: PublicHealthPortal) => {
    setPickerOpen(false)
    setPublicHealthPortal(portal)
  }

  const insuranceLinks = links.filter((l) => INSURANCE_PORTALS.has(l.portalType))
  const hospitalLinks = links.filter((l) => HOSPITAL_PORTALS.has(l.portalType))
  const linkedPortals = new Set(links.map((l) => l.portalType))

  const loadMemberships = () => {
    api.planMemberships.list(patient.id).then(setMemberships).catch(() => setMemberships([]))
  }

  useEffect(() => {
    loadMemberships()
  }, [patient.id, links.map((l) => `${l.id}:${l.lastSyncAt ?? ''}:${l.cardNumber ?? ''}`).join('|')])

  const loadVirtualCard = async (link: IntegrationLink, silent = false) => {
    setLoadingToken(true)
    setTokenError(null)
    try {
      const card = await api.integrationLinks.virtualCard(link.id)
      setVirtualCard(card)
      setSecondsLeft(remainingSeconds(card.expiresAt))
      if (card.cardNumber && card.cardNumber !== link.cardNumber) onCardUpdated()
      if (card.plan) loadMemberships()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao gerar QR Code / token'
      setTokenError(msg)
      if (!silent) message.error(msg)
    } finally {
      setLoadingToken(false)
    }
  }

  const openTokenModal = async (link: IntegrationLink) => {
    setTokenLink(link)
    setVirtualCard(null)
    setTokenError(null)
    await loadVirtualCard(link)
  }

  useEffect(() => {
    if (!tokenLink || !virtualCard?.expiresAt) return
    const timer = window.setInterval(() => {
      const left = remainingSeconds(virtualCard.expiresAt)
      setSecondsLeft(left)
      if (left <= 0) {
        window.clearInterval(timer)
        void loadVirtualCard(tokenLink, true)
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [tokenLink, virtualCard?.expiresAt, virtualCard?.token])

  const openEditCard = (link: IntegrationLink) => {
    setEditLink(link)
    form.setFieldsValue({ cardNumber: link.cardNumber || '' })
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

  const renderLinkActions = (link: IntegrationLink) => {
    const effectiveSyncLinkId = link.effectiveSyncLinkId ?? link.id
    const managedByTitular = link.syncAuthority === 'titular' && effectiveSyncLinkId !== link.id
    const titularName = link.managedByPatientName?.split(' ')[0] ?? 'titular'

    return (
    <CardToolbar>
      {link.portalType === 'unimed' && (
        <Button size="small" icon={<QrcodeOutlined />} onClick={() => openTokenModal(link)}>
          QR / Token
        </Button>
      )}
      {INSURANCE_PORTALS.has(link.portalType) && (
        <Button size="small" icon={<EditOutlined />} onClick={() => openEditCard(link)}>
          Nº carteirinha
        </Button>
      )}
      <Button
        size="small"
        icon={<SyncOutlined />}
        loading={syncingId === effectiveSyncLinkId}
        disabled={!SYNCABLE.has(link.portalType)}
        onClick={() => onSync(effectiveSyncLinkId, link.portalType)}
      >
        {managedByTitular ? `Sincronizar (${titularName})` : 'Sincronizar'}
      </Button>
      <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeLink(link)}>
        Remover
      </Button>
    </CardToolbar>
    )
  }

  return (
    <Space direction="vertical" size={28} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={5} style={{ marginBottom: 4 }}>Convênios e integrações</Title>
          <Text type="secondary">
            Planos de saúde, odontológico, SUS e portais clínicos de {patient.name.split(' ')[0]}.
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setPickerOpen(true)}>
          Nova integração
        </Button>
      </div>

      {/* SUS */}
      <div>
        <Text strong style={{ display: 'block', marginBottom: 10 }}>Sistema público</Text>
        <div style={{ maxWidth: 420 }}>
          <WalletCardFace
            brandKey="conectesus"
            holderName={patient.name}
            numberLabel="Cartão Nacional (CNS)"
            numberValue={patient.cns ? formatCns(patient.cns) : '—'}
            extra={
              patient.cns
                ? <Tag color="success" style={{ margin: 0 }}>Ativo</Tag>
                : <Tag style={{ margin: 0, background: '#ffffff33', border: 'none', color: '#fff' }}>Pendente</Tag>
            }
          />
          <CardToolbar>
            <Text type="secondary" style={{ fontSize: 12, flex: 1 }}>CPF {formatCpf(patient.cpf)}</Text>
            <Button size="small" icon={<CloudDownloadOutlined />} onClick={() => openPublicHealth('conectesus')}>
              {patient.cns ? 'Atualizar ConecteSUS' : 'Importar ConecteSUS'}
            </Button>
          </CardToolbar>
        </div>
        {(patient.ageCategory === 'children' || patient.ageCategory === 'adolescents' || linkedChildrenCount > 0) && (
          <div style={{ maxWidth: 420, marginTop: 16 }}>
            <WalletCardFace
              brandKey="caderneta"
              holderName={linkedChildrenCount > 0 ? `${linkedChildrenCount} filho(s) vinculado(s)` : patient.name}
              numberLabel="Caderneta da Criança"
              numberValue="Minha Família"
              extra={<Tag style={{ margin: 0, background: '#ffffff33', border: 'none', color: '#fff' }}>gov.br</Tag>}
            />
            <CardToolbar>
              <Text type="secondary" style={{ fontSize: 12, flex: 1 }}>
                {linkedChildrenCount > 0
                  ? 'Login como responsável; dados vão aos filhos vinculados'
                  : 'Calendário vacinal previsto + aplicado'}
              </Text>
              <Button size="small" icon={<CloudDownloadOutlined />} onClick={() => openPublicHealth('caderneta')}>
                Importar Caderneta
              </Button>
            </CardToolbar>
          </div>
        )}
      </div>

      <Divider style={{ margin: 0 }} />

      {/* Plano de saúde */}
      <div>
        <Text strong style={{ display: 'block', marginBottom: 4 }}>Plano de saúde</Text>
        <Text type="secondary" style={{ display: 'block', marginBottom: 10, fontSize: 12 }}>
          Operadoras médicas — Unimed, Amil, Bradesco e similares
        </Text>
        {insuranceLinks.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nenhum plano vinculado" />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {insuranceLinks.map((link) => {
              const membership = memberships.find((m) => m.integrationLinkId === link.id)
                || memberships.find((m) => m.source === link.portalType || m.plan?.operator === link.portalType)
              const cardNum = formatCardNumber(link.cardNumber || membership?.memberNumber) ?? '—'
              const effectiveSyncLinkId = link.effectiveSyncLinkId ?? link.id
              const managedByTitular = link.syncAuthority === 'titular' && effectiveSyncLinkId !== link.id
              const syncWhen = link.effectiveLastSyncAt ?? link.lastSyncAt
              return (
                <div key={link.id}>
                  <WalletCardFace
                    brandKey={link.portalType}
                    planLabel={membership?.plan?.planName}
                    holderName={patient.name}
                    numberLabel="Nº da carteirinha"
                    numberValue={cardNum}
                    extra={
                      <Tag color={link.active ? 'success' : 'default'} style={{ margin: 0 }}>
                        {link.active ? 'Vinculado' : 'Inativo'}
                      </Tag>
                    }
                  />
                  {managedByTitular && link.managedByPatientName && (
                    <Alert
                      type="info"
                      showIcon
                      style={{ marginTop: 8, fontSize: 12 }}
                      message="Plano sincronizado pelo titular"
                      description={`Os dados desta carteirinha são atualizados ao sincronizar o vínculo Amil de ${link.managedByPatientName}. O botão abaixo usa esse vínculo.`}
                    />
                  )}
                  {renderLinkActions(link)}
                  <IntegrationLinkSyncBanner linkId={effectiveSyncLinkId} />
                  {syncWhen && (
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 6, paddingLeft: 4 }}>
                      Sync {new Date(syncWhen).toLocaleString('pt-BR')}
                    </Text>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <PlanDetailsCollapse memberships={memberships} />

      <Divider style={{ margin: 0 }} />

      {/* Odontológico — placeholder até integração */}
      <div>
        <Text strong style={{ display: 'block', marginBottom: 4 }}>Plano odontológico</Text>
        <Text type="secondary" style={{ display: 'block', marginBottom: 10, fontSize: 12 }}>
          Operadoras dentais — em breve
        </Text>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nenhum plano odontológico vinculado" />
      </div>

      <Divider style={{ margin: 0 }} />

      {/* Hospitais */}
      <div>
        <Text strong style={{ display: 'block', marginBottom: 4 }}>Hospitais e clínicas</Text>
        <Text type="secondary" style={{ display: 'block', marginBottom: 10, fontSize: 12 }}>
          Portais de exames, laudos e atendimentos — Mater Dei e outros
        </Text>
        {hospitalLinks.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nenhum hospital vinculado" />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {hospitalLinks.map((link) => (
              <div key={link.id}>
                <WalletCardFace
                  brandKey="mater_dei"
                  planLabel="Portal do paciente"
                  holderName={patient.name}
                  numberLabel="Acesso"
                  numberValue={link.email ? formatCpf(link.email) : '—'}
                  extra={
                    <Tag color={link.lastSyncAt ? 'success' : 'warning'} style={{ margin: 0 }}>
                      {link.lastSyncAt ? 'Conectado' : 'Aguardando sync'}
                    </Tag>
                  }
                />
                {renderLinkActions(link)}
                <IntegrationLinkSyncBanner linkId={link.id} />
              </div>
            ))}
          </div>
        )}
      </div>

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
        onImported={onCardUpdated}
      />

      <Modal title="Número da carteirinha" open={!!editLink} onOk={saveCardNumber} confirmLoading={savingCard}
        onCancel={() => setEditLink(null)} okText="Salvar" cancelText="Cancelar">
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="cardNumber" label="Nº da carteirinha" rules={[{ required: true }]}>
            <Input placeholder="Ex: 094995656" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={<Space><BrandTag brand="unimed">Unimed BH</BrandTag> QR / Token</Space>}
        open={!!tokenLink}
        onCancel={() => { setTokenLink(null); setVirtualCard(null); setTokenError(null) }}
        footer={[
          <Button key="close" onClick={() => { setTokenLink(null); setVirtualCard(null) }}>Fechar</Button>,
          <Button key="refresh" type="primary" icon={<SyncOutlined />} loading={loadingToken}
            disabled={!tokenLink} onClick={() => tokenLink && loadVirtualCard(tokenLink)}>
            Gerar novo token
          </Button>,
        ]}
        width={420}
      >
        {loadingToken && !virtualCard ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 12 }}><Text type="secondary">Acessando Cartão Virtual...</Text></div>
          </div>
        ) : tokenError && !virtualCard ? (
          <Alert type="error" showIcon message={tokenError} />
        ) : virtualCard ? (
          <Space direction="vertical" size={16} style={{ width: '100%', alignItems: 'center', paddingTop: 8 }}>
            <QRCode value={virtualCard.qrCode || virtualCard.token} size={200} errorLevel="M" />
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Token</Text>
              <div style={{ fontFamily: 'monospace', fontSize: 28, fontWeight: 700, letterSpacing: 3 }}>
                {virtualCard.token}
              </div>
              {virtualCard.expiresAt && (
                <Tag color={secondsLeft <= 15 ? 'red' : 'green'} style={{ marginTop: 10 }}>
                  Expira em {formatCountdown(secondsLeft)}
                </Tag>
              )}
            </div>
            <Descriptions size="small" column={1} bordered style={{ width: '100%' }}>
              <Descriptions.Item label="Beneficiário">{virtualCard.holderName || patient.name}</Descriptions.Item>
              <Descriptions.Item label="Carteirinha">
                {formatCardNumber(virtualCard.cardNumber) || formatCardNumber(tokenLink?.cardNumber) || '—'}
              </Descriptions.Item>
              {virtualCard.productCode && (
                <Descriptions.Item label="ANS">{virtualCard.productCode}</Descriptions.Item>
              )}
            </Descriptions>
            {tokenError && <Alert type="warning" showIcon message={tokenError} />}
          </Space>
        ) : null}
      </Modal>
    </Space>
  )
}
