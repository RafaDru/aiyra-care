import { Stack } from 'expo-router'
import { AuthProvider } from '@/contexts/AuthContext'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

export default function RootLayout() {
  const { tokens } = useAiyraTheme()
  return (
    <AuthProvider>
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
    </AuthProvider>
  )
}
