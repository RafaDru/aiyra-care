import { Redirect } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '@/contexts/AuthContext'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

export default function IndexGate() {
  const { loading, session, configured } = useAuth()
  const { tokens } = useAiyraTheme()

  if (loading) {
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
    return <Redirect href="/(app)/(tabs)" />
  }

  return <Redirect href="/(auth)/login" />
}
