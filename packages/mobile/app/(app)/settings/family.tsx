import { RefreshControl, ScrollView, StyleSheet, Text } from 'react-native'
import { useCallback, useState } from 'react'
import { PatientAccessGrantsSection } from '@/components/family/PatientAccessGrantsSection'
import { CareCirclesSection } from '@/components/family/CareCirclesSection'
import { FamilyInvitesSection } from '@/components/family/FamilyInvitesSection'
import { ProfileSharesSection } from '@/components/family/ProfileSharesSection'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

export default function SettingsFamilyScreen() {
  const { tokens } = useAiyraTheme()
  const [refreshing, setRefreshing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    setRefreshKey((k) => k + 1)
    setTimeout(() => setRefreshing(false), 400)
  }, [])

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.colorBgLayout }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.colorPrimary} />}
    >
      <Text style={[styles.lead, { color: tokens.colorTextSecondary }]}>
        Paridade com o hub web `/family` — círculos, convites e compartilhamento entre contas (ver
        docs/FAMILY_ACCESS_MODEL.md).
      </Text>
      <CareCirclesSection key={`circles-${refreshKey}`} />
      <ProfileSharesSection key={`shares-${refreshKey}`} />
      <FamilyInvitesSection key={`invites-${refreshKey}`} />
      <PatientAccessGrantsSection key={`grants-${refreshKey}`} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  lead: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
})
