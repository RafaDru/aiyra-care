import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Link, router } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

export default function SettingsScreen() {
  const { account, signOut } = useAuth()
  const { tokens } = useAiyraTheme()

  return (
    <View style={[styles.screen, { backgroundColor: tokens.colorBgLayout }]}>
      <Text style={[styles.title, { color: tokens.colorTextBase }]}>Configurações</Text>
      <Text style={{ color: tokens.colorTextSecondary, marginBottom: 16 }}>{account?.email ?? '—'}</Text>

      <Link href="/(app)/settings/family" asChild>
        <Pressable style={[styles.row, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}>
          <Text style={{ color: tokens.colorTextBase, fontWeight: '600' }}>Família e cuidadores</Text>
          <Text style={{ color: tokens.colorTextSecondary }}>›</Text>
        </Pressable>
      </Link>

      <Pressable
        onPress={() => signOut().then(() => router.replace('/(auth)/login'))}
        style={[styles.row, { borderColor: tokens.colorError, backgroundColor: tokens.colorBgContainer, marginTop: 24 }]}
      >
        <Text style={{ color: tokens.colorError, fontWeight: '600' }}>Sair</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
})
