import { useCallback, useEffect, useMemo, useState } from 'react'
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { SectionCard } from '@/components/family/SectionCard'
import { StatePanel } from '@/components/StatePanel'
import { useIntegrationLinkSyncStatus, type LinkSyncMeta } from '@/hooks/useIntegrationLinkSyncStatus'
import { api } from '@/lib/api'
import type { IntegrationLink } from '@/lib/api.types'
import { portalTypeLabel } from '@/lib/integration-portal-labels'
import { isLinkSessionReady, isSyncablePortal } from '@/lib/silent-sync'
import { webPatientPlanTabUrl } from '@/lib/web-app-url'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Props = {
  patientId: string
}

function sessionHint(
  link: IntegrationLink,
  t: (key: string) => string,
): { label: string; tone: 'ok' | 'warn' | 'muted' } {
  if (link.syncDegraded) return { label: t('patient.integrations.syncDegraded'), tone: 'warn' }
  if (link.authAttention === 'credentials' || link.authAttention === 'session') {
    return { label: t('patient.integrations.loginOnWeb'), tone: 'warn' }
  }
  if (isSyncablePortal(link.portalType) && isLinkSessionReady(link)) {
    return { label: t('patient.integrations.sessionReady'), tone: 'ok' }
  }
  if (isSyncablePortal(link.portalType)) {
    return { label: t('patient.integrations.firstSyncOnWeb'), tone: 'muted' }
  }
  return { label: t('patient.integrations.manageOnWeb'), tone: 'muted' }
}

function LinkRow({
  link,
  meta,
  onOpenWeb,
}: {
  link: IntegrationLink
  meta?: LinkSyncMeta
  onOpenWeb: () => void
}) {
  const { t } = useTranslation()
  const { tokens } = useAiyraTheme()
  const hint = sessionHint(link, t)
  const hintColor =
    hint.tone === 'ok' ? tokens.colorSuccess : hint.tone === 'warn' ? tokens.colorWarning : tokens.colorTextSecondary

  return (
    <View style={[styles.row, { borderColor: tokens.colorBorder }]}>
      <View style={styles.rowHeader}>
        <Text style={[styles.portalTitle, { color: tokens.colorTextBase }]}>{portalTypeLabel(link.portalType)}</Text>
        {!link.active ? (
          <Text style={[styles.badge, { color: tokens.colorTextSecondary }]}>{t('patient.integrations.inactive')}</Text>
        ) : null}
      </View>
      <Text style={{ color: hintColor, fontSize: 13 }}>{hint.label}</Text>
      {meta?.active ? (
        <Text style={{ color: tokens.colorPrimary, fontSize: 13, fontWeight: '600' }}>
          {t('patient.integrations.inProgress', { message: meta.message })}
        </Text>
      ) : null}
      {!meta?.active && meta?.lastSyncLabel ? (
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>
          {t('patient.integrations.lastSync', { when: meta.lastSyncLabel })}
        </Text>
      ) : null}
      {!meta?.active && meta?.noveltyText ? (
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>{meta.noveltyText}</Text>
      ) : null}
      {!meta?.active && meta?.message ? (
        <Text style={{ color: tokens.colorError, fontSize: 13 }}>{meta.message}</Text>
      ) : null}
      {link.managedByPatientName ? (
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>
          {t('patient.integrations.planVia', { name: link.managedByPatientName })}
        </Text>
      ) : null}
      <Pressable
        onPress={onOpenWeb}
        style={[styles.webButton, { borderColor: tokens.colorPrimary, backgroundColor: tokens.colorBgContainer }]}
        accessibilityRole="link"
      >
        <Text style={{ color: tokens.colorPrimary, fontWeight: '600', fontSize: 14 }}>
          {t('patient.integrations.syncOnWeb')}
        </Text>
      </Pressable>
    </View>
  )
}

export function PatientIntegrationsPanel({ patientId }: Props) {
  const { t } = useTranslation()
  const { tokens } = useAiyraTheme()
  const [links, setLinks] = useState<IntegrationLink[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const syncableLinks = useMemo(
    () => links.filter((l) => l.active && isSyncablePortal(l.portalType)),
    [links],
  )
  const syncMeta = useIntegrationLinkSyncStatus(syncableLinks, refreshKey, false)

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setLoading(true)
    else setRefreshing(true)
    setError(null)
    try {
      const rows = await api.integrationLinks.list(patientId)
      setLinks(rows.filter((l) => l.active))
      setRefreshKey((k) => k + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('patient.integrations.loadError'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [patientId, t])

  useEffect(() => {
    void load('initial')
  }, [load])

  const openWebIntegrations = useCallback(() => {
    const url = webPatientPlanTabUrl(patientId, 'integrations')
    void Linking.openURL(url)
  }, [patientId])

  if (loading && !refreshing) {
    return <StatePanel tokens={tokens} loading />
  }

  if (error && !links.length) {
    return <StatePanel tokens={tokens} error={error} onRetry={() => void load('initial')} />
  }

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void load('refresh')} tintColor={tokens.colorPrimary} />
      }
      contentContainerStyle={styles.scroll}
    >
      <SectionCard
        title={t('patient.integrations.title')}
        subtitle={t('patient.integrations.subtitle')}
      >
        <Pressable
          onPress={openWebIntegrations}
          style={[styles.primaryCta, { backgroundColor: tokens.colorPrimary }]}
        >
          <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>
            {t('patient.integrations.openInBrowser')}
          </Text>
        </Pressable>
      </SectionCard>

      {!links.length ? (
        <StatePanel
          tokens={tokens}
          emptyMessage={t('patient.integrations.empty')}
        />
      ) : (
        links.map((link) => (
          <LinkRow
            key={link.id}
            link={link}
            meta={syncMeta[link.id]}
            onOpenWeb={() => void Linking.openURL(webPatientPlanTabUrl(patientId, 'integrations'))}
          />
        ))
      )}

      {error ? (
        <Text style={{ color: tokens.colorError, textAlign: 'center', marginTop: 8 }}>{error}</Text>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 24, gap: 12 },
  primaryCta: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16 },
  row: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 6, marginBottom: 10 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  portalTitle: { fontSize: 16, fontWeight: '700' },
  badge: { fontSize: 12 },
  webButton: { marginTop: 8, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
})
