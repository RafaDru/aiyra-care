import { useCallback, useEffect, useMemo, useState } from 'react'
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
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

function sessionHint(link: IntegrationLink): { label: string; tone: 'ok' | 'warn' | 'muted' } {
  if (link.syncDegraded) return { label: 'Sync pausado (portal degradado)', tone: 'warn' }
  if (link.authAttention === 'credentials' || link.authAttention === 'session') {
    return { label: 'Login necessário no app web', tone: 'warn' }
  }
  if (isSyncablePortal(link.portalType) && isLinkSessionReady(link)) {
    return { label: 'Sessão pronta para sync no web', tone: 'ok' }
  }
  if (isSyncablePortal(link.portalType)) {
    return { label: 'Primeiro sync no app web', tone: 'muted' }
  }
  return { label: 'Gerenciar no app web', tone: 'muted' }
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
  const { tokens } = useAiyraTheme()
  const hint = sessionHint(link)
  const hintColor =
    hint.tone === 'ok' ? tokens.colorSuccess : hint.tone === 'warn' ? tokens.colorWarning : tokens.colorTextSecondary

  return (
    <View style={[styles.row, { borderColor: tokens.colorBorder }]}>
      <View style={styles.rowHeader}>
        <Text style={[styles.portalTitle, { color: tokens.colorTextBase }]}>{portalTypeLabel(link.portalType)}</Text>
        {!link.active ? (
          <Text style={[styles.badge, { color: tokens.colorTextSecondary }]}>Inativo</Text>
        ) : null}
      </View>
      <Text style={{ color: hintColor, fontSize: 13 }}>{hint.label}</Text>
      {meta?.active ? (
        <Text style={{ color: tokens.colorPrimary, fontSize: 13, fontWeight: '600' }}>
          Em andamento: {meta.message}
        </Text>
      ) : null}
      {!meta?.active && meta?.lastSyncLabel ? (
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>Último sync: {meta.lastSyncLabel}</Text>
      ) : null}
      {!meta?.active && meta?.noveltyText ? (
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>{meta.noveltyText}</Text>
      ) : null}
      {!meta?.active && meta?.message ? (
        <Text style={{ color: tokens.colorError, fontSize: 13 }}>{meta.message}</Text>
      ) : null}
      {link.managedByPatientName ? (
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>
          Plano via {link.managedByPatientName}
        </Text>
      ) : null}
      <Pressable
        onPress={onOpenWeb}
        style={[styles.webButton, { borderColor: tokens.colorPrimary, backgroundColor: tokens.colorBgContainer }]}
        accessibilityRole="link"
      >
        <Text style={{ color: tokens.colorPrimary, fontWeight: '600', fontSize: 14 }}>Sincronizar no app web</Text>
      </Pressable>
    </View>
  )
}

export function PatientIntegrationsPanel({ patientId }: Props) {
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
      setError(e instanceof Error ? e.message : 'Erro ao carregar integrações')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [patientId])

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
        title="Integrações"
        subtitle="Status dos portais conectados. Login e sincronização com browser (Playwright) ficam no app web — o mobile não executa scrapers."
      >
        <Pressable
          onPress={openWebIntegrations}
          style={[styles.primaryCta, { backgroundColor: tokens.colorPrimary }]}
        >
          <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>Abrir integrações no navegador</Text>
        </Pressable>
      </SectionCard>

      {!links.length ? (
        <StatePanel
          tokens={tokens}
          emptyMessage="Nenhum portal vinculado. Conecte operadoras ou laboratórios no app web."
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
