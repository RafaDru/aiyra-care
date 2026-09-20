import { PlaceholderTab } from '@/components/PlaceholderTab'
import { ScrollView, StyleSheet } from 'react-native'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

export default function SettingsFamilyScreen() {
  const { tokens } = useAiyraTheme()
  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens.colorBgLayout }} contentContainerStyle={styles.content}>
      <PlaceholderTab
        title="Família e cuidadores"
        subtitle="Paridade com /settings/family — círculos, convites e compartilhamento de perfis."
        note="Ver docs/features/family-access-model.md"
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16 },
})
