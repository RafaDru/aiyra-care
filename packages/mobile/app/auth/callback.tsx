import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import * as Linking from 'expo-linking'
import { router } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { createSessionFromOAuthUrl } from '@/lib/supabase-oauth'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

/** Deep link OAuth (`exp://…/--/auth/callback`) — fallback se bridge abrir o app direto. */
export default function OAuthCallbackScreen() {
  const { session, loading } = useAuth()
  const { tokens } = useAiyraTheme()

  useEffect(() => {
    const ingest = (url: string | null) => {
      if (!url) return
      if (!url.includes('access_token') && !url.includes('code=') && !url.includes('error=')) return
      void createSessionFromOAuthUrl(url).catch(() => undefined)
    }
    void Linking.getInitialURL().then(ingest)
    const sub = Linking.addEventListener('url', ({ url }) => ingest(url))
    return () => sub.remove()
  }, [])

  useEffect(() => {
    if (!loading && session) {
      router.replace('/')
    }
  }, [loading, session])

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.colorBgLayout }}>
      <ActivityIndicator color={tokens.colorPrimary} />
    </View>
  )
}
