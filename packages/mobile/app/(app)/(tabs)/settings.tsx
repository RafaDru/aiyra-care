import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { Link, router } from 'expo-router'
import { AppLogo } from '@/components/brand/AppLogo'
import { useAuth } from '@/contexts/AuthContext'
import { webAppBaseUrl } from '@/lib/web-app-url'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

export default function SettingsScreen() {
  const { account, signOut } = useAuth()
  const { tokens } = useAiyraTheme()

  const webBase = webAppBaseUrl()

  return (
    <View style={[styles.screen, { backgroundColor: tokens.colorBgLayout }]}>
      <View style={styles.logoRow}>
        <AppLogo height={32} />
      </View>
      <Text style={[styles.title, { color: tokens.colorTextBase }]}>Configurações</Text>
      <Text style={{ color: tokens.colorTextSecondary, marginBottom: 16 }}>{account?.email ?? '—'}</Text>

      <Link href="/(app)/settings/family" asChild>
        <Pressable style={[styles.row, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}>
          <Text style={{ color: tokens.colorTextBase, fontWeight: '600' }}>Família e cuidadores</Text>
          <Text style={{ color: tokens.colorTextSecondary }}>›</Text>
        </Pressable>
      </Link>

      {webBase ? (
        <Pressable
          onPress={() => void Linking.openURL(webBase)}
          style={[styles.row, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer, marginTop: 12 }]}
        >
          <View>
            <Text style={{ color: tokens.colorTextBase, fontWeight: '600' }}>Abrir versão web</Text>
            <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>Integrações, sync e edição avançada</Text>
          </View>
          <Text style={{ color: tokens.colorTextSecondary }}>›</Text>
        </Pressable>
      ) : null}

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
  logoRow: { alignItems: 'center', marginBottom: 12 },
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
