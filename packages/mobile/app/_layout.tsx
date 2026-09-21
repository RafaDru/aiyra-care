import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { I18nextProvider } from 'react-i18next'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/contexts/ToastContext'
import i18n, { initI18n } from '@/i18n'
import { AppearancePreferenceProvider } from '@/theme/AppearancePreferenceContext'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

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
      <Stack.Screen name="invite/accept" options={{ title: 'Convite de família', presentation: 'modal' }} />
    </Stack>
  )
}

function AppProviders() {
  return (
    <AppearancePreferenceProvider>
      <AuthProvider>
        <ToastProvider>
          <RootStack />
        </ToastProvider>
      </AuthProvider>
    </AppearancePreferenceProvider>
  )
}

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false)

  useEffect(() => {
    void initI18n().finally(() => setI18nReady(true))
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
