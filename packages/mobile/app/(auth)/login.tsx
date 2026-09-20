import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Redirect, router, useLocalSearchParams } from 'expo-router'
import { StatePanel } from '@/components/StatePanel'
import { useAuth } from '@/contexts/AuthContext'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

export default function LoginScreen() {
  const { redirect, token: inviteToken } = useLocalSearchParams<{ redirect?: string; token?: string }>()
  const { configured, loading, session, signInWithPassword } = useAuth()
  const { tokens } = useAiyraTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: tokens.colorBgLayout }]}>
        <StatePanel tokens={tokens} loading />
      </View>
    )
  }

  if (session) {
    if (redirect === 'invite' && typeof inviteToken === 'string' && inviteToken) {
      return <Redirect href={`/invite/accept?token=${encodeURIComponent(inviteToken)}`} />
    }
    return <Redirect href="/(app)/(tabs)" />
  }

  async function onSubmit() {
    if (!configured) {
      setError('Copie packages/mobile/.env.example para .env e preencha as chaves Supabase.')
      return
    }
    if (!email.trim() || !password) {
      setError('Informe e-mail e senha.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await signInWithPassword(email.trim(), password)
      if (redirect === 'invite' && typeof inviteToken === 'string' && inviteToken) {
        router.replace(`/invite/accept?token=${encodeURIComponent(inviteToken)}`)
      } else {
        router.replace('/(app)/(tabs)')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha no login')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: tokens.colorBgLayout }]}
    >
      <View style={[styles.card, { backgroundColor: tokens.colorBgContainer, borderColor: tokens.colorBorder }]}>
        <Text style={[styles.brand, { color: tokens.colorPrimary }]}>AiyraCare</Text>
        <Text style={[styles.hint, { color: tokens.colorTextSecondary }]}>
          {configured ? 'Entre com a mesma conta do web.' : 'Configure EXPO_PUBLIC_SUPABASE_* no .env (ver .env.example).'}
        </Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          placeholder="E-mail"
          placeholderTextColor={tokens.colorTextSecondary}
          value={email}
          onChangeText={setEmail}
          editable={!submitting}
          style={[styles.input, { borderColor: tokens.colorBorder, color: tokens.colorTextBase }]}
        />
        <TextInput
          secureTextEntry
          autoComplete="password"
          placeholder="Senha"
          placeholderTextColor={tokens.colorTextSecondary}
          value={password}
          onChangeText={setPassword}
          editable={!submitting}
          onSubmitEditing={() => void onSubmit()}
          style={[styles.input, { borderColor: tokens.colorBorder, color: tokens.colorTextBase }]}
        />
        {error ? (
          <Text style={[styles.error, { color: tokens.colorError }]} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
        <Pressable
          onPress={onSubmit}
          disabled={submitting}
          style={[styles.button, { backgroundColor: tokens.colorPrimary, opacity: submitting ? 0.7 : 1 }]}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: 24 },
  card: { borderWidth: 1, borderRadius: 16, padding: 24, gap: 12 },
  brand: { fontSize: 28, fontWeight: '700', textAlign: 'center' },
  hint: { fontSize: 14, textAlign: 'center', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  error: { fontSize: 14 },
  button: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
})
