import { useCallback, useEffect, useMemo, useState } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { useIntegrationLinkSyncStatus } from '@/hooks/useIntegrationLinkSyncStatus'
import { api } from '@/lib/api'
import type { IntegrationLink } from '@/lib/api.types'
import { isSyncablePortal } from '@/lib/silent-sync'
import { webPatientPlanTabUrl } from '@/lib/web-app-url'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Props = {
  patientId: string
}

export function PatientWalletSyncBanner({ patientId }: Props) {
  const { tokens } = useAiyraTheme()
  const [links, setLinks] = useState<IntegrationLink[]>([])

  const load = useCallback(async () => {
    try {
      const rows = await api.integrationLinks.list(patientId)
      setLinks(rows.filter((l) => l.active && isSyncablePortal(l.portalType)))
    } catch {
      setLinks([])
    }
  }, [patientId])

  useEffect(() => {
    void load()
  }, [load])

  const syncMeta = useIntegrationLinkSyncStatus(links, 0, false)
  const activeCount = useMemo(() => Object.values(syncMeta).filter((m) => m.active).length, [syncMeta])
  const failed = useMemo(() => Object.values(syncMeta).find((m) => m.lastStatus === 'failed'), [syncMeta])

  if (!links.length) return null

  const openWallet = () => void Linking.openURL(webPatientPlanTabUrl(patientId, 'wallet'))

  return (
    <View style={[styles.banner, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}>
      <Text style={{ color: tokens.colorTextBase, fontWeight: '600' }}>Sincronização de convênios</Text>
      {activeCount > 0 ? (
        <Text style={{ color: tokens.colorPrimary, fontSize: 13 }}>
          {activeCount} portal(is) sincronizando no servidor…
        </Text>
      ) : failed ? (
        <Text style={{ color: tokens.colorError, fontSize: 13 }}>{failed.message}</Text>
      ) : (
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>
          Status em tempo real; para sincronizar ou renovar login, use o app web.
        </Text>
      )}
      <Pressable onPress={openWallet} style={[styles.linkBtn, { borderColor: tokens.colorPrimary }]}>
        <Text style={{ color: tokens.colorPrimary, fontWeight: '600' }}>Abrir Carteira no web</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
  linkBtn: { marginTop: 4, borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
})
