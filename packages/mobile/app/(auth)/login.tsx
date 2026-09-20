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
import { Redirect, router } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

export default function LoginScreen() {
  const { configured, loading, session, signInWithPassword } = useAuth()
  const { tokens } = useAiyraTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && session) {
    return <Redirect href="/(app)/(tabs)" />
  }

  async function onSubmit() {
    setError(null)
    setSubmitting(true)
    try {
      await signInWithPassword(email.trim(), password)
      router.replace('/(app)/(tabs)')
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
          {configured ? 'Entre com a mesma conta do web.' : 'Configure EXPO_PUBLIC_SUPABASE_* no .env.'}
        </Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="E-mail"
          value={email}
          onChangeText={setEmail}
          style={[styles.input, { borderColor: tokens.colorBorder, color: tokens.colorTextBase }]}
        />
        <TextInput
          secureTextEntry
          placeholder="Senha"
          value={password}
          onChangeText={setPassword}
          style={[styles.input, { borderColor: tokens.colorBorder, color: tokens.colorTextBase }]}
        />
        {error ? <Text style={{ color: tokens.colorError }}>{error}</Text> : null}
        <Pressable
          onPress={onSubmit}
          disabled={submitting}
          style={[styles.button, { backgroundColor: tokens.colorPrimary }]}
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
  button: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
})
