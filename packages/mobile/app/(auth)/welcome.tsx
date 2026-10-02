import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Link, router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { AuthScreen } from '@/components/auth/AuthScreen'
import { AppLogo } from '@/components/brand/AppLogo'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

export default function WelcomeScreen() {
  const { t } = useTranslation()
  const { tokens } = useAiyraTheme()

  return (
    <AuthScreen>
      <View style={styles.heroBlock}>
        <View style={styles.hero}>
          <AppLogo variant="square" height={120} />
          <Text style={[styles.title, { color: tokens.colorTextBase }]}>{t('welcome.title')}</Text>
          <Text style={[styles.subtitle, { color: tokens.colorTextSecondary }]}>{t('welcome.subtitle')}</Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => router.push('/(auth)/login')}
            style={[styles.primary, { backgroundColor: tokens.colorPrimary }]}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>{t('welcome.signIn')}</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push({ pathname: '/(auth)/login', params: { mode: 'signup' } })}
            style={[styles.secondary, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
            accessibilityRole="button"
          >
            <Text style={[styles.secondaryText, { color: tokens.colorTextBase }]}>{t('welcome.signUp')}</Text>
          </Pressable>
        </View>

        <Text style={[styles.foot, { color: tokens.colorTextSecondary }]}>
          {t('welcome.footPrefix')}{' '}
          <Link href="/(auth)/login" style={{ color: tokens.colorPrimary }}>
            {t('welcome.footLink')}
          </Link>
          .
        </Text>
      </View>
    </AuthScreen>
  )
}

const styles = StyleSheet.create({
  heroBlock: { gap: 32 },
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
