import { Redirect, Stack } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { AvaGlobalDock } from '@/components/ava/AvaGlobalDock'
import { RequireComplianceGate } from '@/components/auth/RequireComplianceGate'
import { useAuth } from '@/contexts/AuthContext'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

export default function AppShellLayout() {
  const { loading, session, configured } = useAuth()
  const { tokens } = useAiyraTheme()

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: tokens.colorBgLayout }}>
        <ActivityIndicator color={tokens.colorPrimary} />
      </View>
    )
  }

  if (configured && !session) {
    return <Redirect href="/(auth)/login" />
  }

  return (
    <RequireComplianceGate>
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerTintColor: tokens.colorPrimary }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="patient/[id]" options={{ title: 'Perfil' }} />
          <Stack.Screen name="settings/family" options={{ title: 'Família e cuidadores' }} />
          <Stack.Screen name="compliance/accept" options={{ title: 'Termos e privacidade', headerBackVisible: false }} />
        </Stack>
        <AvaGlobalDock />
      </View>
    </RequireComplianceGate>
  )
}
