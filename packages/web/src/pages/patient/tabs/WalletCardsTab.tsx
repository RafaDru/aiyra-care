import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Typography, Button, Space, Tag, Empty, Modal, App, QRCode, Spin, Alert, Descriptions, Tooltip,
} from 'antd'
import { SyncOutlined, QrcodeOutlined } from '@ant-design/icons'
import { api } from '../../../lib/api.js'
import type { Patient, IntegrationLink, UnimedVirtualCard, PlanMembershipWithPlan } from '../../../lib/api.types.js'
import { BrandTag } from '../../../components/brands/BrandLogo.js'
import { useSilentWalletSync } from '../../../hooks/useSilentWalletSync.js'
import { useSilentConecteSUSSync } from '../../../hooks/useSilentConecteSUSSync.js'
import type { GovBrSessionView } from '../../../lib/api.types.js'
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
import {
  buildWalletSyncBanners,
  isWalletLinkDataStale,
  walletSyncBannerMessage,
} from '../../../lib/wallet-sync-banner.js'
import { isLinkSessionReady } from '../../../lib/silent-sync.js'
import { saveWalletLinkCache, getWalletLinkCache } from '../../../lib/wallet-link-cache.js'
import { WalletTodayPanel } from '../../../components/patient/WalletTodayPanel.js'

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
  const { t } = useTranslation()
  const { message } = App.useApp()
  const [memberships, setMemberships] = useState<PlanMembershipWithPlan[]>([])
  const [tokenLink, setTokenLink] = useState<IntegrationLink | null>(null)
  const [virtualCard, setVirtualCard] = useState<UnimedVirtualCard | null>(null)
  const [loadingToken, setLoadingToken] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [syncRefreshKey, setSyncRefreshKey] = useState(0)
  const [govbrSession, setGovbrSession] = useState<GovBrSessionView | null>(null)
  const highlightRef = useRef<HTMLDivElement | null>(null)

  const insuranceLinks = useMemo(
    () => links.filter((l) => INSURANCE_PORTALS.has(l.portalType)),
    [links],
  )

  const bumpSyncRefresh = useCallback(() => {
    onCardUpdated()
    setSyncRefreshKey((k) => k + 1)
  }, [onCardUpdated])

  const onConecteSusSynced = useCallback(() => {
    onCardUpdated()
    api.account.govbrSession().then(setGovbrSession).catch(() => null)
  }, [onCardUpdated])

  useEffect(() => {
    api.account.govbrSession()
      .then(setGovbrSession)
      .catch(() => setGovbrSession(null))
  }, [patient.id])

  useSilentWalletSync(links, bumpSyncRefresh)

  useSilentConecteSUSSync(
    patient.id,
    patient.cpf,
    govbrSession?.sessionReady ?? false,
    govbrSession?.conectesusLastFetchAt,
    onConecteSusSynced,
  )

  usePatientSyncCompletions(patient.id, bumpSyncRefresh)

  const syncMeta = useWalletLinkSyncStatus(insuranceLinks, syncRefreshKey, false)
  const walletBanner = walletSyncBannerMessage(t, buildWalletSyncBanners(insuranceLinks, syncMeta))

  useEffect(() => {
    api.planMemberships.list(patient.id)
      .then((data) => {
        setMemberships(data)
        for (const link of insuranceLinks) {
          saveWalletLinkCache(link.effectiveSyncLinkId ?? link.id, {
            membershipsJson: JSON.stringify(data),
          })
        }
      })
      .catch(() => {
        const fallbackLink = insuranceLinks.find((l) => l.syncDegraded) ?? insuranceLinks[0]
        if (!fallbackLink) {
          setMemberships([])
          return
        }
        const cached = getWalletLinkCache(fallbackLink.effectiveSyncLinkId ?? fallbackLink.id)
        if (cached?.membershipsJson) {
          try {
            setMemberships(JSON.parse(cached.membershipsJson))
          } catch {
            setMemberships([])
          }
        } else {
          setMemberships([])
        }
      })
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
      const msg = err instanceof Error ? err.message : t('walletCards.tokenError')
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
        <Title level={5} style={{ marginBottom: 4 }}>{t('walletCards.title', { name: firstName })}</Title>
        <Text type="secondary">{t('walletCards.subtitle')}</Text>
      </div>

      <WalletTodayPanel patientId={patient.id} refreshKey={syncRefreshKey} />

      <div>
        <Text strong style={{ display: 'block', marginBottom: 10 }}>{t('walletCards.publicSystem')}</Text>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          <div
            ref={highlightCard === 'conectesus' ? highlightRef : undefined}
          >
            <WalletCardFace
              id="wallet-card-conectesus"
              brandKey="conectesus"
              holderName={patient.name}
              numberLabel={t('walletCards.cnsLabel')}
              numberValue={patient.cns ? formatCns(patient.cns) : '—'}
              highlighted={highlightCard === 'conectesus'}
              extra={
                patient.cns
                  ? <Tag color="success" style={{ margin: 0 }}>{t('walletCards.active')}</Tag>
                  : <Tag style={{ margin: 0, background: '#ffffff33', border: 'none', color: '#fff' }}>{t('walletCards.pending')}</Tag>
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
                holderName={linkedChildrenCount > 0 ? t('walletCards.linkedChildren', { count: linkedChildrenCount }) : patient.name}
                numberLabel={t('walletCards.childBookLabel')}
                numberValue={t('walletCards.myFamily')}
                highlighted={highlightCard === 'caderneta'}
                extra={<Tag style={{ margin: 0, background: '#ffffff33', border: 'none', color: '#fff' }}>gov.br</Tag>}
              />
              <CardToolbar>
                <Text type="secondary" style={{ fontSize: 12, flex: 1 }}>{t('walletCards.vaccineCalendarHint')}</Text>
              </CardToolbar>
            </div>
          )}
        </div>
      </div>

      <div>
        <Text strong style={{ display: 'block', marginBottom: 4 }}>{t('walletCards.healthPlan')}</Text>
        <Text type="secondary" style={{ display: 'block', marginBottom: 10, fontSize: 12 }}>
          {t('walletCards.healthPlanHint')}
        </Text>
        {walletBanner && (
          <Alert
            type="warning"
            showIcon
            data-testid="wallet-sync-banner"
            style={{ marginBottom: 12 }}
            message={walletBanner}
          />
        )}
        {insuranceLinks.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('walletCards.noCards')} />
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
                    numberLabel={t('walletCards.cardNumberLabel')}
                    numberValue={cardNum}
                    highlighted={isHighlight}
                    extra={
                      <Tag color={link.active ? 'success' : 'default'} style={{ margin: 0 }}>
                        {link.active ? t('walletCards.active') : t('walletCards.inactive')}
                      </Tag>
                    }
                  />
                  <CardToolbar>
                    {link.portalType === 'unimed' && (
                      <Button size="small" icon={<QrcodeOutlined />} onClick={() => openTokenModal(link)}>
                        {t('walletCards.qrToken')}
                      </Button>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {meta?.active ? (
                        <Space size={4}>
                          <SyncOutlined spin style={{ color: '#1677ff', fontSize: 11 }} />
                          <Text type="secondary" style={{ fontSize: 11 }}>{meta.message}</Text>
                        </Space>
                      ) : meta?.noveltyText ? (
                        <Tooltip title={meta.lastSyncLabel ? t('walletCards.updatedAt', { when: meta.lastSyncLabel }) : undefined}>
                          <Tag color="success" style={{ margin: 0, fontSize: 11 }}>{meta.noveltyText}</Tag>
                        </Tooltip>
                      ) : meta?.lastSyncLabel ? (
                        <Space size={4} wrap>
                          <Text type="secondary" style={{ fontSize: 11 }}>{t('walletCards.updatedAt', { when: meta.lastSyncLabel })}</Text>
                          {isWalletLinkDataStale(link) && isLinkSessionReady(link) && (
                            <Tag color="warning" data-testid="wallet-card-stale-hint" style={{ margin: 0, fontSize: 10 }}>
                              {t('walletCards.staleHint')}
                            </Tag>
                          )}
                        </Space>
                      ) : (
                        <Text type="secondary" style={{ fontSize: 11 }}>{t('walletCards.syncFirstTime')}</Text>
                      )}
                      {meta?.message && !meta.active && (
                        <Tooltip title={meta.message}>
                          <Tag color="error" style={{ margin: '4px 0 0', fontSize: 10 }}>{t('walletCards.failed')}</Tag>
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
        <Text strong style={{ display: 'block', marginBottom: 4 }}>{t('walletCards.dentalPlan')}</Text>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('walletCards.noDentalPlan')} />
      </div>

      <Modal
        title={<Space><BrandTag brand="unimed">Unimed BH</BrandTag> {t('walletCards.qrToken')}</Space>}
        open={!!tokenLink}
        onCancel={() => { setTokenLink(null); setVirtualCard(null); setTokenError(null) }}
        footer={[
          <Button key="close" onClick={() => { setTokenLink(null); setVirtualCard(null) }}>{t('walletCards.tokenModal.close')}</Button>,
          <Button key="refresh" type="primary" icon={<SyncOutlined />} loading={loadingToken}
            disabled={!tokenLink} onClick={() => tokenLink && loadVirtualCard(tokenLink)}>
            {t('walletCards.tokenModal.generateNew')}
          </Button>,
        ]}
        width={420}
      >
        {loadingToken && !virtualCard ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 12 }}><Text type="secondary">{t('walletCards.tokenModal.loading')}</Text></div>
          </div>
        ) : tokenError && !virtualCard ? (
          <Alert type="error" showIcon message={tokenError} />
        ) : virtualCard ? (
          <Space direction="vertical" size={16} style={{ width: '100%', alignItems: 'center', paddingTop: 8 }}>
            <QRCode value={virtualCard.qrCode || virtualCard.token} size={200} errorLevel="M" />
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>{t('walletCards.tokenModal.token')}</Text>
              <div style={{ fontFamily: 'monospace', fontSize: 28, fontWeight: 700, letterSpacing: 3 }}>
                {virtualCard.token}
              </div>
              {virtualCard.expiresAt && (
                <Tag color={secondsLeft <= 15 ? 'red' : 'green'} style={{ marginTop: 10 }}>
                  {t('walletCards.tokenModal.expiresIn', { time: formatCountdown(secondsLeft) })}
                </Tag>
              )}
            </div>
            <Descriptions size="small" column={1} bordered style={{ width: '100%' }}>
              <Descriptions.Item label={t('walletCards.tokenModal.beneficiary')}>{virtualCard.holderName || patient.name}</Descriptions.Item>
              <Descriptions.Item label={t('walletCards.tokenModal.card')}>
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
