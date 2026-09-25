import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Redirect, router, useLocalSearchParams } from 'expo-router'
import { AuthScreen } from '@/components/auth/AuthScreen'
import { PasswordField } from '@/components/auth/PasswordField'
import { AppLogo } from '@/components/brand/AppLogo'
import { LegalDocumentModal } from '@/components/legal/LegalDocumentModal'
import { StatePanel } from '@/components/StatePanel'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { AUTH_PASSWORD_HINT, AUTH_PASSWORD_MIN_LENGTH } from '@/lib/auth-policy'
import type { LegalDocumentKind } from '@/lib/api.types'
import { reportAuthClientError } from '@/lib/client-errors'
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

  useEffect(() => {
    if (modeParam === 'signup' || modeParam === 'login') {
      setMode(parseAuthMode(modeParam))
    }
  }, [modeParam])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [legalAccept, setLegalAccept] = useState(false)
  const [legalModalKind, setLegalModalKind] = useState<LegalDocumentKind | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [oauthSubmitting, setOauthSubmitting] = useState(false)

  const setAuthMode = (next: AuthMode) => {
    setMode(next)
    setLegalAccept(false)
    setError(null)
    setInfo(null)
    setPasswordConfirm('')
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
    if (password.length < AUTH_PASSWORD_MIN_LENGTH) {
      setError(`A senha deve ter pelo menos ${AUTH_PASSWORD_MIN_LENGTH} caracteres.`)
      return
    }
    if (mode === 'signup') {
      if (password !== passwordConfirm) {
        setError('As senhas não coincidem.')
        return
      }
      if (!legalAccept) {
        setError('Aceite os termos e a política de privacidade para criar sua conta.')
        return
      }
    }
    setError(null)
    setInfo(null)
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await signInWithPassword(email.trim(), password)
      } else {
        const result = await signUpWithPassword(email.trim(), password)
        if (result.kind === 'email_confirmation') {
          setInfo(
            'Conta criada. Se o ambiente exige confirmação, abra o link no e-mail e depois use Entrar. Caso já tenha sessão ativa, tente Entrar agora.',
          )
          setAuthMode('login')
          return
        }
        await refreshSync()
        await api.compliance.accept()
      }
      await afterAuthSuccess()
    } catch (e) {
      const message = e instanceof Error ? e.message : mode === 'login' ? 'Falha no login' : 'Falha ao criar conta'
      setError(message)
      void reportAuthClientError(mode, message)
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
      const message = e instanceof Error ? e.message : 'Falha no login com Google'
      setError(message)
      void reportAuthClientError('google', message)
    } finally {
      setOauthSubmitting(false)
    }
  }

  return (
    <AuthScreen>
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
              : 'Cadastro com e-mail e senha.'
            : 'Configure EXPO_PUBLIC_SUPABASE_* no .env (ver .env.example).'}
        </Text>

        <View style={[styles.segmentRow, { backgroundColor: tokens.colorBgLayout, borderColor: tokens.colorBorder }]}>
          <Pressable
            onPress={() => setAuthMode('login')}
            style={[styles.segment, mode === 'login' && { backgroundColor: tokens.colorBgContainer }]}
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
            style={[styles.segment, mode === 'signup' && { backgroundColor: tokens.colorBgContainer }]}
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
        <PasswordField
          tokens={tokens}
          value={password}
          onChangeText={setPassword}
          autoComplete={mode === 'login' ? 'password' : 'password-new'}
          editable={!submitting && !oauthSubmitting}
          onSubmitEditing={() => void onSubmit()}
        />
        {mode === 'signup' ? (
          <>
            <Text style={[styles.policy, { color: tokens.colorTextSecondary }]}>{AUTH_PASSWORD_HINT}</Text>
            <PasswordField
              tokens={tokens}
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              placeholder="Confirmar senha"
              autoComplete="password-new"
              editable={!submitting && !oauthSubmitting}
            />
          </>
        ) : null}

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

        {info ? (
          <Text style={[styles.info, { color: tokens.colorPrimary }]} accessibilityRole="text">
            {info}
          </Text>
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
    </AuthScreen>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: 24 },
  card: { borderWidth: 1, borderRadius: 16, padding: 24, gap: 12 },
  logoWrap: { alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  hint: { fontSize: 14, textAlign: 'center', marginBottom: 4 },
  policy: { fontSize: 12, lineHeight: 18 },
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
  info: { fontSize: 14, lineHeight: 20 },
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
