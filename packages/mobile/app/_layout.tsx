import { useEffect, useState } from 'react'
import { ActivityIndicator, LogBox, View } from 'react-native'
import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { I18nextProvider } from 'react-i18next'
import { AppLockProvider } from '@/contexts/AppLockContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/contexts/ToastContext'
import i18n, { initI18n } from '@/i18n'
import { AppErrorBoundary } from '@/components/errors/AppErrorBoundary'
import { MobileTelemetryRoute } from '@/components/telemetry/MobileTelemetryRoute'
import { AppearancePreferenceProvider } from '@/theme/AppearancePreferenceContext'
import { useAiyraTheme } from '@/theme/useAiyraTheme'
import { logMobilePublicEnv } from '@/lib/log-mobile-public-env'
import { getSupabaseOAuthRedirectUri } from '@/lib/oauth-redirect-url'

function RootStack() {
  const { tokens } = useAiyraTheme()
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: tokens.colorBgContainer },
        headerTintColor: tokens.colorPrimary,
        contentStyle: { backgroundColor: tokens.colorBgLayout },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(app)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="invite/accept" options={{ title: 'Convite de família', presentation: 'modal' }} />
    </Stack>
  )
}

function AppProviders() {
  return (
    <AppearancePreferenceProvider>
      <AuthProvider>
        <AppLockProvider>
          <ToastProvider>
            <AppErrorBoundary feature="mobile_shell">
              <MobileTelemetryRoute />
              <RootStack />
            </AppErrorBoundary>
          </ToastProvider>
        </AppLockProvider>
      </AuthProvider>
    </AppearancePreferenceProvider>
  )
}

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false)

  useEffect(() => {
    if (__DEV__) {
      LogBox.ignoreLogs([
        'Cannot connect to Expo CLI',
        'Expo CLI',
      ])
    }
    logMobilePublicEnv()
    console.log(
      '[Aiyra mobile] bundle git',
      process.env.EXPO_PUBLIC_BUNDLE_GIT_SHA ?? 'unknown',
    )
    console.log('[Aiyra OAuth] redirectTo (boot)', getSupabaseOAuthRedirectUri())
    const bootI18n = Promise.race([
      initI18n(),
      new Promise<void>((resolve) => {
        setTimeout(resolve, 5_000)
      }),
    ])
    void bootI18n.finally(() => setI18nReady(true))
  }, [])

  if (!i18nReady) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      </SafeAreaProvider>
    )
  }

  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <AppProviders />
      </I18nextProvider>
    </SafeAreaProvider>
  )
}
