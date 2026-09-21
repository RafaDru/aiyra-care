import { Stack } from 'expo-router'
import { AuthProvider } from '@/contexts/AuthContext'
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

export default function RootLayout() {
  return (
    <AppearancePreferenceProvider>
      <AuthProvider>
        <RootStack />
      </AuthProvider>
    </AppearancePreferenceProvider>
  )
}
