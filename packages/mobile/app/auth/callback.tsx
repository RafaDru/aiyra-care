import { ActivityIndicator, View } from 'react-native'

/** Deep link OAuth Supabase (`exp://…/--/auth/callback`). Sessão: `AuthContext` + `Linking`. */
export default function OAuthCallbackScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
    </View>
  )
}
