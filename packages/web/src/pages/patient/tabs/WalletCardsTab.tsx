import { useEffect, useRef, useState } from 'react'
import {
  Typography, Button, Space, Tag, Empty, Modal, App, QRCode, Spin, Alert, Descriptions, Tooltip,
} from 'antd'
import { SyncOutlined, QrcodeOutlined } from '@ant-design/icons'
import { api } from '../../../lib/api.js'
import type { Patient, IntegrationLink, UnimedVirtualCard, PlanMembershipWithPlan } from '../../../lib/api.types.js'
import { BrandTag } from '../../../components/brands/BrandLogo.js'
import { useSilentWalletSync } from '../../../hooks/useSilentWalletSync.js'
import { useWalletLinkSyncStatus } from '../../../hooks/useWalletLinkSyncStatus.js'
import { usePatientSyncCompletions } from '../../../hooks/usePatientSyncCompletions.js'
import {
  INSURANCE_PORTALS,
  WalletCardFace,
  CardToolbar,
  formatCpf,
  formatCns,
  formatCardNumber,
  formatCountdown,
  remainingSeconds,
} from './wallet-shared.js'

const { Text, Title } = Typography

interface Props {
  patient: Patient
  links: IntegrationLink[]
  linkedChildrenCount?: number
  highlightCard?: string | null
  onCardUpdated: () => void
}

export function WalletCardsTab({
  patient,
  links,
  linkedChildrenCount = 0,
  highlightCard,
  onCardUpdated,
}: Props) {
  const { message } = App.useApp()
  const [memberships, setMemberships] = useState<PlanMembershipWithPlan[]>([])
  const [tokenLink, setTokenLink] = useState<IntegrationLink | null>(null)
  const [virtualCard, setVirtualCard] = useState<UnimedVirtualCard | null>(null)
  const [loadingToken, setLoadingToken] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [syncRefreshKey, setSyncRefreshKey] = useState(0)
  const highlightRef = useRef<HTMLDivElement | null>(null)

  const insuranceLinks = links.filter((l) => INSURANCE_PORTALS.has(l.portalType))

  useSilentWalletSync(links, () => {
    onCardUpdated()
    setSyncRefreshKey((k) => k + 1)
  })

  usePatientSyncCompletions(patient.id, () => {
    onCardUpdated()
    setSyncRefreshKey((k) => k + 1)
  })

  const syncMeta = useWalletLinkSyncStatus(insuranceLinks, syncRefreshKey, false)

  useEffect(() => {
    api.planMemberships.list(patient.id).then(setMemberships).catch(() => setMemberships([]))
  }, [patient.id, links.map((l) => `${l.id}:${l.cardNumber ?? ''}`).join('|')])

  useEffect(() => {
    if (!highlightCard || !highlightRef.current) return
    highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlightCard])

  const loadVirtualCard = async (link: IntegrationLink, silent = false) => {
    setLoadingToken(true)
    setTokenError(null)
    try {
      const card = await api.integrationLinks.virtualCard(link.id)
      setVirtualCard(card)
      setSecondsLeft(remainingSeconds(card.expiresAt))
      if (card.cardNumber && card.cardNumber !== link.cardNumber) onCardUpdated()
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

  const firstName = patient.name.split(' ')[0]

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div>
        <Title level={5} style={{ marginBottom: 4 }}>Carteira de {firstName}</Title>
        <Text type="secondary">
          Cartões e credenciais para consulta e atendimento. Sincronização em Integrações.
        </Text>
      </div>

      <div>
        <Text strong style={{ display: 'block', marginBottom: 10 }}>Sistema público</Text>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          <div
            ref={highlightCard === 'conectesus' ? highlightRef : undefined}
          >
            <WalletCardFace
              id="wallet-card-conectesus"
              brandKey="conectesus"
              holderName={patient.name}
              numberLabel="Cartão Nacional (CNS)"
              numberValue={patient.cns ? formatCns(patient.cns) : '—'}
              highlighted={highlightCard === 'conectesus'}
              extra={
                patient.cns
                  ? <Tag color="success" style={{ margin: 0 }}>Ativo</Tag>
                  : <Tag style={{ margin: 0, background: '#ffffff33', border: 'none', color: '#fff' }}>Pendente</Tag>
              }
            />
            <CardToolbar>
              <Text type="secondary" style={{ fontSize: 12, flex: 1 }}>CPF {formatCpf(patient.cpf)}</Text>
            </CardToolbar>
          </div>

          {(patient.ageCategory === 'children' || patient.ageCategory === 'adolescents' || linkedChildrenCount > 0) && (
            <div ref={highlightCard === 'caderneta' ? highlightRef : undefined}>
              <WalletCardFace
                id="wallet-card-caderneta"
                brandKey="caderneta"
                holderName={linkedChildrenCount > 0 ? `${linkedChildrenCount} filho(s) vinculado(s)` : patient.name}
                numberLabel="Caderneta da Criança"
                numberValue="Minha Família"
                highlighted={highlightCard === 'caderneta'}
                extra={<Tag style={{ margin: 0, background: '#ffffff33', border: 'none', color: '#fff' }}>gov.br</Tag>}
              />
              <CardToolbar>
                <Text type="secondary" style={{ fontSize: 12, flex: 1 }}>Calendário vacinal previsto + aplicado</Text>
              </CardToolbar>
            </div>
          )}
        </div>
      </div>

      <div>
        <Text strong style={{ display: 'block', marginBottom: 4 }}>Plano de saúde</Text>
        <Text type="secondary" style={{ display: 'block', marginBottom: 10, fontSize: 12 }}>
          Carteirinhas das operadoras vinculadas. Atualização automática em segundo plano quando há sessão válida.
        </Text>
        {insuranceLinks.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nenhuma carteirinha — vincule em Integrações" />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {insuranceLinks.map((link) => {
              const membership = memberships.find((m) => m.integrationLinkId === link.id)
                || memberships.find((m) => m.source === link.portalType || m.plan?.operator === link.portalType)
              const cardNum = formatCardNumber(link.cardNumber || membership?.memberNumber) ?? '—'
              const isHighlight = highlightCard === link.portalType
              const meta = syncMeta[link.id]
              return (
                <div
                  key={link.id}
                  ref={isHighlight ? highlightRef : undefined}
                >
                  <WalletCardFace
                    id={`wallet-card-${link.portalType}`}
                    brandKey={link.portalType}
                    planLabel={membership?.plan?.planName}
                    holderName={patient.name}
                    numberLabel="Nº da carteirinha"
                    numberValue={cardNum}
                    highlighted={isHighlight}
                    extra={
                      <Tag color={link.active ? 'success' : 'default'} style={{ margin: 0 }}>
                        {link.active ? 'Ativo' : 'Inativo'}
                      </Tag>
                    }
                  />
                  <CardToolbar>
                    {link.portalType === 'unimed' && (
                      <Button size="small" icon={<QrcodeOutlined />} onClick={() => openTokenModal(link)}>
                        QR / Token
                      </Button>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {meta?.active ? (
                        <Space size={4}>
                          <SyncOutlined spin style={{ color: '#1677ff', fontSize: 11 }} />
                          <Text type="secondary" style={{ fontSize: 11 }}>{meta.message}</Text>
                        </Space>
                      ) : meta?.noveltyText ? (
                        <Tooltip title={meta.lastSyncLabel ? `Atualizado ${meta.lastSyncLabel}` : undefined}>
                          <Tag color="success" style={{ margin: 0, fontSize: 11 }}>{meta.noveltyText}</Tag>
                        </Tooltip>
                      ) : meta?.lastSyncLabel ? (
                        <Text type="secondary" style={{ fontSize: 11 }}>Atualizado {meta.lastSyncLabel}</Text>
                      ) : (
                        <Text type="secondary" style={{ fontSize: 11 }}>Sincronize em Integrações na primeira vez</Text>
                      )}
                      {meta?.message && !meta.active && (
                        <Tooltip title={meta.message}>
                          <Tag color="error" style={{ margin: '4px 0 0', fontSize: 10 }}>Falhou</Tag>
                        </Tooltip>
                      )}
                    </div>
                  </CardToolbar>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div>
        <Text strong style={{ display: 'block', marginBottom: 4 }}>Plano odontológico</Text>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nenhum plano odontológico vinculado" />
      </div>

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
