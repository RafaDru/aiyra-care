import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Link, router } from 'expo-router'
import { AppLogo } from '@/components/brand/AppLogo'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

export default function WelcomeScreen() {
  const { tokens } = useAiyraTheme()

  return (
    <View style={[styles.screen, { backgroundColor: tokens.colorBgLayout }]}>
      <View style={styles.hero}>
        <AppLogo height={48} />
        <Text style={[styles.title, { color: tokens.colorTextBase }]}>
          Saúde da família, em um só lugar
        </Text>
        <Text style={[styles.subtitle, { color: tokens.colorTextSecondary }]}>
          Acompanhe carteira, exames e cuidado diário — no celular ou no computador, com a mesma conta.
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={() => router.push('/(auth)/login')}
          style={[styles.primary, { backgroundColor: tokens.colorPrimary }]}
          accessibilityRole="button"
        >
          <Text style={styles.primaryText}>Entrar</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push({ pathname: '/(auth)/login', params: { mode: 'signup' } })}
          style={[styles.secondary, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
          accessibilityRole="button"
        >
          <Text style={[styles.secondaryText, { color: tokens.colorTextBase }]}>Criar conta</Text>
        </Pressable>
      </View>

      <Text style={[styles.foot, { color: tokens.colorTextSecondary }]}>
        Versão web com recursos avançados (integrações e sync){' '}
        <Link href="/(auth)/login" style={{ color: tokens.colorPrimary }}>
          após o login
        </Link>
        .
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 28, justifyContent: 'center', gap: 32 },
  hero: { alignItems: 'center', gap: 16 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', lineHeight: 30 },
  subtitle: { fontSize: 16, textAlign: 'center', lineHeight: 24, maxWidth: 340 },
  actions: { gap: 12 },
  primary: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondary: { borderWidth: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  secondaryText: { fontWeight: '600', fontSize: 16 },
  foot: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
})
