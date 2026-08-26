import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Alert, Button, Card, List, Space, Tag, Typography, App } from 'antd'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api.js'
import { trackProductEvent } from '../../lib/product-events.js'
import { DismissibleHint } from '../ui/DismissibleHint.js'
import type { BillingMe, BillingOffers } from '../../lib/api.types.js'

const { Text, Title } = Typography

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)
}

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-US' : 'pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function subscriptionStatusColor(status: string | null): string {
  if (!status) return 'default'
  if (status === 'active' || status === 'trialing') return 'green'
  if (status === 'past_due') return 'orange'
  if (status === 'canceled' || status === 'unpaid') return 'red'
  return 'default'
}

export function BillingSettingsCard() {
  const { t, i18n } = useTranslation()
  const { message } = App.useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const [offers, setOffers] = useState<BillingOffers | null>(null)
  const [me, setMe] = useState<BillingMe | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutId, setCheckoutId] = useState<string | null>(null)
  const [subscribing, setSubscribing] = useState(false)
  const [openingPortal, setOpeningPortal] = useState(false)
  const [exportingBilling, setExportingBilling] = useState(false)

  const loadBilling = () => {
    return Promise.all([api.billing.offers(), api.billing.me()])
      .then(([o, m]) => { setOffers(o); setMe(m) })
      .catch(() => message.error(t('billing.loadError')))
  }

  useEffect(() => {
    loadBilling().finally(() => setLoading(false))
  }, [message, t])

  useEffect(() => {
    const billingParam = searchParams.get('billing')
    if (!billingParam) return
    if (billingParam === 'success') {
      message.success(t('billing.paymentSuccess'))
      trackProductEvent('billing_checkout_completed', {
        checkout_kind: 'pack',
        status: 'completed',
      })
    }
    if (billingParam === 'subscription-success') {
      message.success(t('billing.subscriptionSuccess'))
      trackProductEvent('billing_checkout_completed', {
        checkout_kind: 'subscription',
        package_id: 'family',
        status: 'completed',
      })
    }
    if (billingParam === 'cancel') message.info(t('billing.paymentCanceled'))
    loadBilling()
    searchParams.delete('billing')
    setSearchParams(searchParams, { replace: true })
  }, [message, searchParams, setSearchParams, t])

  const startCheckout = async (packageId: 'pack_10' | 'pack_30') => {
    setCheckoutId(packageId)
    trackProductEvent('billing_checkout_started', {
      package_id: packageId,
      checkout_kind: 'pack',
    })
    try {
      const { url } = await api.billing.checkout(packageId)
      if (url) window.location.href = url
      else message.warning(t('billing.stripeNotReady'))
    } catch (err) {
      message.error(err instanceof Error ? err.message : t('billing.checkoutError'))
    } finally {
      setCheckoutId(null)
    }
  }

  const startFamilySubscription = async () => {
    setSubscribing(true)
    trackProductEvent('billing_checkout_started', {
      package_id: 'family',
      checkout_kind: 'subscription',
    })
    try {
      const { url } = await api.billing.checkoutSubscription()
      if (url) window.location.href = url
      else message.warning(t('billing.stripeNotReady'))
    } catch (err) {
      message.error(err instanceof Error ? err.message : t('billing.checkoutError'))
    } finally {
      setSubscribing(false)
    }
  }

  const openCustomerPortal = async () => {
    setOpeningPortal(true)
    try {
      const { url } = await api.billing.customerPortal()
      if (url) window.location.href = url
      else message.warning(t('billing.stripeNotReady'))
    } catch (err) {
      message.error(err instanceof Error ? err.message : t('billing.portalError'))
    } finally {
      setOpeningPortal(false)
    }
  }

  const downloadFiscalExport = async () => {
    setExportingBilling(true)
    try {
      const { blob, filename } = await api.billing.downloadContabilizeiExport()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      message.success(t('billing.exportSuccess'))
    } catch (err) {
      message.error(err instanceof Error ? err.message : t('billing.exportError'))
    } finally {
      setExportingBilling(false)
    }
  }

  if (loading) return <Card loading />

  const quota = me?.quota
  const entitlement = me?.entitlement
  const hasStripeCustomer = Boolean(entitlement?.stripeCustomerId)
  const showSubscribeFamily = entitlement?.planTier !== 'family'
    && offers?.familyPlan.stripePriceId
    && entitlement?.subscriptionStatus !== 'active'
    && entitlement?.subscriptionStatus !== 'trialing'
    && entitlement?.subscriptionStatus !== 'past_due'

  return (
    <Card>
      <Title level={5} style={{ marginTop: 0 }}>{t('accountPlan.planTitle')}</Title>
      <Text type="secondary">{t('billing.subtitle')}</Text>

      {quota && (
        <Alert
          type={quota.totalAvailable > 0 ? 'success' : 'warning'}
          showIcon
          style={{ marginTop: 16 }}
          message={t('billing.quota', {
            total: quota.totalAvailable,
            free: quota.monthlyFreeRemaining,
            pack: quota.packageCredits,
          })}
        />
      )}

      {entitlement && (
        <div style={{ marginTop: 12 }}>
          <Space wrap align="center">
            <Tag color={entitlement.planTier === 'family' ? 'gold' : 'default'}>
              {t(`billing.plan.${entitlement.planTier}`)}
            </Tag>
            <Text type="secondary">
              {t('billing.monthlyAllowance', { n: entitlement.monthlyFreeAllowance })}
            </Text>
            {entitlement.subscriptionStatus && (
              <Tag color={subscriptionStatusColor(entitlement.subscriptionStatus)}>
                {t(`billing.subscriptionStatus.${entitlement.subscriptionStatus}`, {
                  defaultValue: entitlement.subscriptionStatus,
                })}
              </Tag>
            )}
          </Space>
          {entitlement.subscriptionCurrentPeriodEnd && (
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              {entitlement.subscriptionCancelAtPeriodEnd
                ? t('billing.renewsUntil', {
                    date: formatDate(entitlement.subscriptionCurrentPeriodEnd, i18n.language),
                  })
                : t('billing.renewsOn', {
                    date: formatDate(entitlement.subscriptionCurrentPeriodEnd, i18n.language),
                  })}
            </Text>
          )}
        </div>
      )}

      {entitlement?.subscriptionStatus === 'past_due' && (
        <Alert
          type="warning"
          showIcon
          style={{ marginTop: 12 }}
          message={t('billing.pastDueTitle')}
          description={t('billing.pastDueHint')}
        />
      )}

      {offers && (
        <Space wrap style={{ marginTop: 16 }}>
          {showSubscribeFamily && (
            <Button type="primary" loading={subscribing} onClick={startFamilySubscription}>
              {t('accountPlan.subscribeFamily')}
            </Button>
          )}
          {hasStripeCustomer && offers.stripeEnabled && (
            <Button loading={openingPortal} onClick={openCustomerPortal}>
              {t('accountPlan.manageSubscription')}
            </Button>
          )}
          {offers.packages.map((p) => (
            <Button
              key={p.id}
              type="primary"
              ghost
              loading={checkoutId === p.id}
              onClick={() => startCheckout(p.id as 'pack_10' | 'pack_30')}
            >
              {p.label} — {formatMoney(p.amountCents, p.currency)}
            </Button>
          ))}
        </Space>
      )}

      {!offers?.stripeEnabled && (
        <DismissibleHint
          hintId="billing.stripe-not-configured"
          type="info"
          showIcon
          style={{ marginTop: 16 }}
          message={t('billing.stripeNotConfigured')}
        />
      )}

      {me?.canExportBilling && (
        <div style={{ marginTop: 16 }}>
          <Button loading={exportingBilling} onClick={downloadFiscalExport}>
            {t('billing.exportContabilizei')}
          </Button>
          <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
            {t('billing.exportContabilizeiHint')}
          </Text>
        </div>
      )}

      {me && me.purchases.length > 0 && (
        <>
          <Title level={5} style={{ marginTop: 24 }}>{t('billing.history')}</Title>
          <List
            size="small"
            dataSource={me.purchases}
            renderItem={(p) => (
              <List.Item>
                <Space>
                  <Text>{new Date(p.createdAt).toLocaleDateString('pt-BR')}</Text>
                  <Text>{p.packageCredits} créditos</Text>
                  <Text>{formatMoney(p.amountCents, p.currency)}</Text>
                  <Tag color={p.status === 'completed' ? 'green' : 'default'}>{p.status}</Tag>
                </Space>
              </List.Item>
            )}
          />
        </>
      )}
    </Card>
  )
}
