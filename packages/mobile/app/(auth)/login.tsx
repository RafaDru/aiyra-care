import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Redirect, router, useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { AuthPreferenceRow } from '@/components/auth/AuthPreferenceRow'
import { AuthScreen } from '@/components/auth/AuthScreen'
import { PasswordField } from '@/components/auth/PasswordField'
import { useAppLock, useRequiresBiometricUnlock } from '@/contexts/AppLockContext'
import { AppLogo } from '@/components/brand/AppLogo'
import { LegalDocumentModal } from '@/components/legal/LegalDocumentModal'
import { StatePanel } from '@/components/StatePanel'
import { NoticeBanner } from '@/components/ui/NoticeBanner'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { api } from '@/lib/api'
import { AUTH_PASSWORD_HINT, AUTH_PASSWORD_MIN_LENGTH } from '@/lib/auth-policy'
import { formatAuthError } from '@/lib/auth-errors'
import type { LegalDocumentKind } from '@/lib/api.types'
import { reportAuthClientError } from '@/lib/client-errors'
import { loadLastEmail, saveLastEmail } from '@/lib/remember-me'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type AuthMode = 'login' | 'signup'

function parseAuthMode(value: string | undefined): AuthMode {
  return value === 'signup' ? 'signup' : 'login'
}

export default function LoginScreen() {
  const { t } = useTranslation()
  const toast = useToast()
  const scrollFocusedRef = useRef<(() => void) | null>(null)
  const [postSignupNotice, setPostSignupNotice] = useState<string | null>(null)
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
    rememberMe,
    setRememberMe,
  } = useAuth()
  const {
    biometricSupport,
    setBiometricUnlockEnabled,
    unlock: unlockApp,
  } = useAppLock()
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
  const [enableBiometric, setEnableBiometric] = useState(false)

  useEffect(() => {
    void loadLastEmail().then((saved) => {
      if (saved) setEmail(saved)
    })
  }, [])

  const setAuthMode = (next: AuthMode) => {
    setMode(next)
    setLegalAccept(false)
    setError(null)
    setInfo(null)
    setPasswordConfirm('')
    if (next === 'signup') setPostSignupNotice(null)
  }

  const focusField = () => {
    scrollFocusedRef.current?.()
  }

  const needsUnlock = useRequiresBiometricUnlock(Boolean(session))

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
    if (needsUnlock) {
      return <Redirect href="/(auth)/unlock" />
    }
    return <Redirect href="/(app)/(tabs)" />
  }

  async function finalizeSessionOptions() {
    if (rememberMe) {
      await saveLastEmail(email.trim())
    }
    if (mode === 'login' && enableBiometric && rememberMe) {
      if (!biometricSupport.available) {
        toast.info(t('appLock.notAvailable'))
      } else {
        const ok = await setBiometricUnlockEnabled(true, t('appLock.prompt'))
        if (ok) toast.success(t('appLock.enabled'))
        else setEnableBiometric(false)
      }
    } else {
      unlockApp()
    }
  }

  async function afterAuthSuccess() {
    await finalizeSessionOptions()
    if (redirect === 'invite' && typeof inviteToken === 'string' && inviteToken) {
      router.replace(`/invite/accept?token=${encodeURIComponent(inviteToken)}`)
      return
    }
    router.replace('/(app)/(tabs)')
  }

  async function onSubmit() {
    if (!configured) {
      const msg = t('auth.envHint')
      setError(msg)
      toast.error(msg)
      return
    }
    if (!email.trim() || !password) {
      const msg = t('auth.missingEmailPassword')
      setError(msg)
      toast.error(msg)
      return
    }
    if (password.length < AUTH_PASSWORD_MIN_LENGTH) {
      const msg = t('auth.passwordMin', { min: AUTH_PASSWORD_MIN_LENGTH })
      setError(msg)
      toast.error(msg)
      return
    }
    if (mode === 'signup') {
      if (password !== passwordConfirm) {
        const msg = t('auth.passwordMismatch')
        setError(msg)
        toast.error(msg)
        return
      }
      if (!legalAccept) {
        const msg = t('auth.legalRequired')
        setError(msg)
        toast.error(msg)
        return
      }
    }
    setError(null)
    setInfo(null)
    setPostSignupNotice(null)
    setSubmitting(true)
    try {
      await setRememberMe(mode === 'login' ? rememberMe : true)
      if (mode === 'login') {
        await signInWithPassword(email.trim(), password)
      } else {
        const result = await signUpWithPassword(email.trim(), password)
        if (result.kind === 'email_confirmation') {
          const msg = t('auth.emailConfirmSuccess')
          const toastMsg = t('auth.emailConfirmToast')
          setMode('login')
          setLegalAccept(false)
          setPasswordConfirm('')
          setError(null)
          setInfo(msg)
          setPostSignupNotice(toastMsg)
          toast.success(toastMsg, { durationMs: 10000, position: 'bottom' })
          router.replace({ pathname: '/(auth)/login', params: { mode: 'login' } })
          return
        }
        await refreshSync()
        await api.compliance.accept()
      }
      await afterAuthSuccess()
    } catch (e) {
      const message = formatAuthError(
        e,
        t,
      )
      const fallback = mode === 'login' ? t('auth.loginFailed') : t('auth.signupFailed')
      const display = message || fallback
      setError(display)
      toast.error(display)
      void reportAuthClientError(mode, display)
    } finally {
      setSubmitting(false)
    }
  }

  async function onGoogle() {
    if (!configured) {
      const msg = t('auth.envHint')
      setError(msg)
      toast.error(msg)
      return
    }
    setError(null)
    setOauthSubmitting(true)
    try {
      await setRememberMe(rememberMe)
      await signInWithGoogle()
      await afterAuthSuccess()
    } catch (e) {
      const message = formatAuthError(e, t) || t('auth.googleFailed')
      setError(message)
      toast.error(message)
      void reportAuthClientError('google', message)
    } finally {
      setOauthSubmitting(false)
    }
  }

  return (
    <AuthScreen
      header={<AppLogo variant="square" height={112} />}
      onScrollReady={(fn) => {
        scrollFocusedRef.current = fn
      }}
    >
      {postSignupNotice ? (
        <NoticeBanner tokens={tokens} tone="success">
          {postSignupNotice}
        </NoticeBanner>
      ) : null}

      <LegalDocumentModal
        kind={legalModalKind}
        visible={legalModalKind !== null}
        onClose={() => setLegalModalKind(null)}
      />
      <View style={[styles.card, { backgroundColor: tokens.colorBgContainer, borderColor: tokens.colorBorder }]}>
        <Text style={[styles.title, { color: tokens.colorTextBase }]}>
          {mode === 'login' ? t('auth.titleLogin') : t('auth.titleSignup')}
        </Text>
        <Text style={[styles.hint, { color: tokens.colorTextSecondary }]}>
          {configured
            ? mode === 'login'
              ? t('auth.subtitleLogin')
              : t('auth.subtitleSignup')
            : t('auth.notConfigured')}
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
              {t('auth.modeLogin')}
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
              {t('auth.modeSignup')}
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
            <Text style={[styles.oauthButtonText, { color: tokens.colorTextBase }]}>{t('auth.google')}</Text>
          )}
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: tokens.colorBorder }]} />
          <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>{t('auth.emailDivider')}</Text>
          <View style={[styles.dividerLine, { backgroundColor: tokens.colorBorder }]} />
        </View>

        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          placeholder={t('auth.email')}
          placeholderTextColor={tokens.colorTextSecondary}
          value={email}
          onChangeText={setEmail}
          editable={!submitting && !oauthSubmitting}
          onFocus={focusField}
          style={[styles.input, { borderColor: tokens.colorBorder, color: tokens.colorTextBase }]}
        />
        <PasswordField
          tokens={tokens}
          value={password}
          onChangeText={setPassword}
          autoComplete={mode === 'login' ? 'password' : 'password-new'}
          editable={!submitting && !oauthSubmitting}
          onSubmitEditing={() => void onSubmit()}
          onFocus={focusField}
        />
        {mode === 'signup' ? (
          <>
            <Text style={[styles.policy, { color: tokens.colorTextSecondary }]}>{AUTH_PASSWORD_HINT}</Text>
            <PasswordField
              tokens={tokens}
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              placeholder={t('auth.passwordConfirm')}
              autoComplete="password-new"
              editable={!submitting && !oauthSubmitting}
              onFocus={focusField}
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
              {t('auth.legalPrefix')}{' '}
              <Text style={{ color: tokens.colorPrimary }} onPress={() => setLegalModalKind('terms_of_use')}>
                {t('auth.termsLink')}
              </Text>
              {' · '}
              <Text style={{ color: tokens.colorPrimary }} onPress={() => setLegalModalKind('privacy_policy')}>
                {t('auth.privacyLink')}
              </Text>
              .
            </Text>
          </Pressable>
        ) : null}

        {mode === 'login' ? (
          <>
            <AuthPreferenceRow
              tokens={tokens}
              checked={rememberMe}
              onToggle={() => {
                const next = !rememberMe
                void setRememberMe(next)
                if (!next) setEnableBiometric(false)
              }}
              label={t('auth.rememberMe')}
              hint={t('auth.rememberMeHint')}
            />
            <AuthPreferenceRow
              tokens={tokens}
              checked={enableBiometric}
              onToggle={() => setEnableBiometric((v) => !v)}
              label={t('auth.biometricUnlock')}
              hint={
                rememberMe
                  ? t('auth.biometricUnlockHint')
                  : t('auth.biometricNeedsRemember')
              }
              disabled={!rememberMe || !biometricSupport.available}
            />
          </>
        ) : null}

        {info ? (
          <NoticeBanner tokens={tokens} tone="success">
            {info}
          </NoticeBanner>
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
            <Text style={styles.buttonText}>{mode === 'login' ? t('auth.signIn') : t('auth.signUp')}</Text>
          )}
        </Pressable>
      </View>
    </AuthScreen>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: 24 },
  card: { borderWidth: 1, borderRadius: 16, padding: 24, gap: 12 },
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
