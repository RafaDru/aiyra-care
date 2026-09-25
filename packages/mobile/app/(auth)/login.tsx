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
import { AppLogo } from '@/components/brand/AppLogo'
import { LegalDocumentModal } from '@/components/legal/LegalDocumentModal'
import { StatePanel } from '@/components/StatePanel'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import type { LegalDocumentKind } from '@/lib/api.types'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type AuthMode = 'login' | 'signup'

function parseAuthMode(value: string | undefined): AuthMode {
  return value === 'signup' ? 'signup' : 'login'
}

export default function LoginScreen() {
  const { redirect, token: inviteToken, mode: modeParam } = useLocalSearchParams<{
    redirect?: string
    token?: string
    mode?: string
  }>()
  const {
    configured,
    loading,
    session,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    refreshSync,
  } = useAuth()
  const { tokens } = useAiyraTheme()
  const [mode, setMode] = useState<AuthMode>(() => parseAuthMode(modeParam))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [legalAccept, setLegalAccept] = useState(false)
  const [legalModalKind, setLegalModalKind] = useState<LegalDocumentKind | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [oauthSubmitting, setOauthSubmitting] = useState(false)

  const setAuthMode = (next: AuthMode) => {
    setMode(next)
    setLegalAccept(false)
    setError(null)
  }

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

  async function afterAuthSuccess() {
    if (redirect === 'invite' && typeof inviteToken === 'string' && inviteToken) {
      router.replace(`/invite/accept?token=${encodeURIComponent(inviteToken)}`)
      return
    }
    router.replace('/(app)/(tabs)')
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
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (mode === 'signup' && !legalAccept) {
      setError('Aceite os termos e a política de privacidade para criar sua conta.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await signInWithPassword(email.trim(), password)
      } else {
        await signUpWithPassword(email.trim(), password)
        await refreshSync()
        await api.compliance.accept()
      }
      await afterAuthSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : mode === 'login' ? 'Falha no login' : 'Falha ao criar conta')
    } finally {
      setSubmitting(false)
    }
  }

  async function onGoogle() {
    if (!configured) {
      setError('Copie packages/mobile/.env.example para .env e preencha as chaves Supabase.')
      return
    }
    setError(null)
    setOauthSubmitting(true)
    try {
      await signInWithGoogle()
      await afterAuthSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha no login com Google')
    } finally {
      setOauthSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: tokens.colorBgLayout }]}
    >
      <LegalDocumentModal
        kind={legalModalKind}
        visible={legalModalKind !== null}
        onClose={() => setLegalModalKind(null)}
      />
      <View style={[styles.card, { backgroundColor: tokens.colorBgContainer, borderColor: tokens.colorBorder }]}>
        <View style={styles.logoWrap}>
          <AppLogo height={36} />
        </View>
        <Text style={[styles.title, { color: tokens.colorTextBase }]}>
          {mode === 'login' ? 'Entrar na sua conta' : 'Criar conta'}
        </Text>
        <Text style={[styles.hint, { color: tokens.colorTextSecondary }]}>
          {configured
            ? mode === 'login'
              ? 'Use a mesma conta do web.'
              : 'Cadastro com e-mail e senha; confirme o e-mail se o Supabase exigir.'
            : 'Configure EXPO_PUBLIC_SUPABASE_* no .env (ver .env.example).'}
        </Text>

        <View style={[styles.segmentRow, { backgroundColor: tokens.colorBgLayout, borderColor: tokens.colorBorder }]}>
          <Pressable
            onPress={() => setAuthMode('login')}
            style={[
              styles.segment,
              mode === 'login' && { backgroundColor: tokens.colorBgContainer },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === 'login' }}
          >
            <Text
              style={{
                fontWeight: mode === 'login' ? '700' : '500',
                color: mode === 'login' ? tokens.colorPrimary : tokens.colorTextSecondary,
              }}
            >
              Entrar
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setAuthMode('signup')}
            style={[
              styles.segment,
              mode === 'signup' && { backgroundColor: tokens.colorBgContainer },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === 'signup' }}
          >
            <Text
              style={{
                fontWeight: mode === 'signup' ? '700' : '500',
                color: mode === 'signup' ? tokens.colorPrimary : tokens.colorTextSecondary,
              }}
            >
              Criar conta
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => void onGoogle()}
          disabled={submitting || oauthSubmitting}
          style={[
            styles.oauthButton,
            {
              borderColor: tokens.colorBorder,
              backgroundColor: tokens.colorBgLayout,
              opacity: oauthSubmitting ? 0.7 : 1,
            },
          ]}
        >
          {oauthSubmitting ? (
            <ActivityIndicator color={tokens.colorPrimary} />
          ) : (
            <Text style={[styles.oauthButtonText, { color: tokens.colorTextBase }]}>Continuar com Google</Text>
          )}
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: tokens.colorBorder }]} />
          <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>ou e-mail</Text>
          <View style={[styles.dividerLine, { backgroundColor: tokens.colorBorder }]} />
        </View>

        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          placeholder="E-mail"
          placeholderTextColor={tokens.colorTextSecondary}
          value={email}
          onChangeText={setEmail}
          editable={!submitting && !oauthSubmitting}
          style={[styles.input, { borderColor: tokens.colorBorder, color: tokens.colorTextBase }]}
        />
        <TextInput
          secureTextEntry
          autoComplete={mode === 'login' ? 'password' : 'password-new'}
          placeholder="Senha"
          placeholderTextColor={tokens.colorTextSecondary}
          value={password}
          onChangeText={setPassword}
          editable={!submitting && !oauthSubmitting}
          onSubmitEditing={() => void onSubmit()}
          style={[styles.input, { borderColor: tokens.colorBorder, color: tokens.colorTextBase }]}
        />

        {mode === 'signup' ? (
          <Pressable
            onPress={() => setLegalAccept((v) => !v)}
            style={styles.legalRow}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: legalAccept }}
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: tokens.colorBorder,
                  backgroundColor: legalAccept ? tokens.colorPrimary : tokens.colorBgContainer,
                },
              ]}
            >
              {legalAccept ? <Text style={styles.checkMark}>✓</Text> : null}
            </View>
            <Text style={[styles.legalText, { color: tokens.colorTextSecondary }]}>
              Li e aceito os{' '}
              <Text style={{ color: tokens.colorPrimary }} onPress={() => setLegalModalKind('terms_of_use')}>
                Termos de uso
              </Text>
              {' e a '}
              <Text style={{ color: tokens.colorPrimary }} onPress={() => setLegalModalKind('privacy_policy')}>
                Política de privacidade
              </Text>
              .
            </Text>
          </Pressable>
        ) : null}

        {error ? (
          <Text style={[styles.error, { color: tokens.colorError }]} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
        <Pressable
          onPress={() => void onSubmit()}
          disabled={submitting || oauthSubmitting}
          style={[styles.button, { backgroundColor: tokens.colorPrimary, opacity: submitting ? 0.7 : 1 }]}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{mode === 'login' ? 'Entrar' : 'Criar conta'}</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: 24 },
  card: { borderWidth: 1, borderRadius: 16, padding: 24, gap: 12 },
  logoWrap: { alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  hint: { fontSize: 14, textAlign: 'center', marginBottom: 4 },
  segmentRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  error: { fontSize: 14 },
  button: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1 },
  oauthButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  oauthButtonText: { fontWeight: '600', fontSize: 15 },
  legalRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkMark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  legalText: { flex: 1, fontSize: 13, lineHeight: 20 },
})
