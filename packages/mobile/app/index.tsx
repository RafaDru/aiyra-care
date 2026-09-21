import { Redirect } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAppLock } from '@/contexts/AppLockContext'
import { useAuth } from '@/contexts/AuthContext'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

export default function IndexGate() {
  const { loading, session, configured } = useAuth()
  const { ready: lockReady, biometricUnlockEnabled, isUnlocked } = useAppLock()
  const { tokens } = useAiyraTheme()

  if (loading || !lockReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: tokens.colorBgLayout }}>
        <ActivityIndicator color={tokens.colorPrimary} />
      </View>
    )
  }

  if (!configured) {
    return <Redirect href="/(auth)/login" />
  }

  if (session) {
    if (biometricUnlockEnabled && !isUnlocked) {
      return <Redirect href="/(auth)/unlock" />
    }
    return <Redirect href="/(app)/(tabs)" />
  }

  return <Redirect href="/(auth)/welcome" />
}
