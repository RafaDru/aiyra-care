import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { Redirect, router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { AppLogo } from '@/components/brand/AppLogo'
import { useAppLock } from '@/contexts/AppLockContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { loadLastEmail } from '@/lib/remember-me'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

export default function UnlockScreen() {
  const { t } = useTranslation()
  const toast = useToast()
  const { tokens } = useAiyraTheme()
  const { loading, session, signOut } = useAuth()
  const { ready, biometricSupport, isUnlocked, tryBiometricUnlock } = useAppLock()
  const [emailHint, setEmailHint] = useState<string | null>(null)
  const [unlocking, setUnlocking] = useState(false)
  const autoPrompted = useRef(false)

  useEffect(() => {
    void loadLastEmail().then(setEmailHint)
  }, [])

  useEffect(() => {
    if (!ready || loading || !session || isUnlocked || autoPrompted.current) return
    autoPrompted.current = true
    void attemptUnlock()
  }, [ready, loading, session, isUnlocked])

  async function attemptUnlock() {
    setUnlocking(true)
    try {
      const ok = await tryBiometricUnlock(t('appLock.prompt'))
      if (!ok) toast.info(t('appLock.cancelled'))
    } finally {
      setUnlocking(false)
    }
  }

  if (loading || !ready) {
    return (
      <View style={[styles.screen, { backgroundColor: tokens.colorBgLayout }]}>
        <ActivityIndicator color={tokens.colorPrimary} />
      </View>
    )
  }

  if (!session) {
    return <Redirect href="/(auth)/welcome" />
  }

  if (isUnlocked) {
    return <Redirect href="/(app)/(tabs)" />
  }

  return (
    <View style={[styles.screen, { backgroundColor: tokens.colorBgLayout }]}>
      <View style={styles.content}>
        <AppLogo variant="square" height={96} />
        <Text style={[styles.title, { color: tokens.colorTextBase }]}>{t('appLock.title')}</Text>
        <Text style={[styles.subtitle, { color: tokens.colorTextSecondary }]}>
          {emailHint ? t('appLock.subtitleWithEmail', { email: emailHint }) : t('appLock.subtitle')}
        </Text>

        <Pressable
          onPress={() => void attemptUnlock()}
          disabled={unlocking}
          style={[styles.primary, { backgroundColor: tokens.colorPrimary, opacity: unlocking ? 0.7 : 1 }]}
        >
          {unlocking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>
              {t('appLock.unlockWith', { method: biometricSupport.label })}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() =>
            void signOut().then(() => {
              router.replace('/(auth)/login')
            })
          }
          style={[styles.secondary, { borderColor: tokens.colorBorder }]}
        >
          <Text style={{ color: tokens.colorTextBase, fontWeight: '600' }}>{t('appLock.usePassword')}</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: 24 },
  content: { alignItems: 'center', gap: 16, maxWidth: 360, alignSelf: 'center', width: '100%' },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  primary: { width: '100%', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondary: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
})
