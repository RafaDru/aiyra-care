import { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { Alert, Button, Card, Checkbox, Divider, Form, Input, Segmented, Space, Spin, Typography } from 'antd'
import { GoogleOutlined, WindowsOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext.js'
import { formatAuthError } from '../lib/auth-errors.js'
import { AuthPageLayout } from '../layouts/AuthPageLayout.js'
import { DismissibleHint } from '../components/ui/DismissibleHint.js'
import { LegalDocumentModal } from '../components/legal/LegalDocumentModal.js'
import { api } from '../lib/api.js'
import type { LegalDocumentKind } from '../lib/api.types.js'
import { LOGIN_LEGAL_KINDS, COMPLIANCE_ACCEPT_PATH } from '../lib/legal-paths.js'
import { AUTH_PASSWORD_HINT, AUTH_PASSWORD_MIN_LENGTH } from '../lib/auth-policy.js'

const { Title, Text } = Typography

function parseAuthMode(value: string | null): 'login' | 'signup' {
  return value === 'signup' ? 'signup' : 'login'
}

function LegalFooterLink({
  kind,
  label,
  onOpen,
}: {
  kind: LegalDocumentKind
  label: string
  onOpen: (kind: LegalDocumentKind) => void
}) {
  return (
    <Button type="link" size="small" style={{ padding: 0, height: 'auto', fontSize: 12 }} onClick={() => onOpen(kind)}>
      {label}
    </Button>
  )
}

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    configured,
    session,
    loading: authLoading,
    rememberMe,
    setRememberMe,
    refreshSync,
    signInWithGoogle,
    signInWithMicrosoft,
    signInWithPassword,
    signUpWithPassword,
  } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'signup'>(() => parseAuthMode(searchParams.get('mode')))
  const [submitting, setSubmitting] = useState(false)
  const [legalAccept, setLegalAccept] = useState(false)
  const [legalModalKind, setLegalModalKind] = useState<LegalDocumentKind | null>(null)

  const openLegal = (kind: LegalDocumentKind) => setLegalModalKind(kind)

  useEffect(() => {
    setMode(parseAuthMode(searchParams.get('mode')))
  }, [searchParams])

  const setAuthMode = (next: 'login' | 'signup') => {
    setMode(next)
    setLegalAccept(false)
    setError(null)
    setInfo(null)
    setSearchParams({ mode: next }, { replace: true })
  }

  useEffect(() => {
    if (!configured || authLoading || !session) return
    api.compliance.status()
      .then((s) => navigate(s.compliant ? '/' : COMPLIANCE_ACCEPT_PATH, { replace: true }))
      .catch(() => navigate('/', { replace: true }))
  }, [configured, authLoading, session, navigate])

  if (!configured) {
    return (
      <AuthPageLayout>
        <DismissibleHint
          hintId="auth.not-configured"
          type="warning"
          message={t('auth.notConfigured')}
          description={t('auth.notConfiguredHint')}
        />
      </AuthPageLayout>
    )
  }

  if (authLoading || session) {
    return (
      <AuthPageLayout>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      </AuthPageLayout>
    )
  }

  const onFinish = async (values: { email: string; password: string; passwordConfirm?: string }) => {
    if (mode === 'signup' && !legalAccept) {
      setError(t('compliance.mustAcceptBeforeSignup'))
      return
    }
    if (mode === 'signup' && values.password !== values.passwordConfirm) {
      setError(t('auth.passwordMismatch'))
      return
    }
    setSubmitting(true)
    setError(null)
    setInfo(null)
    try {
      if (mode === 'login') {
        await signInWithPassword(values.email, values.password, rememberMe)
        navigate('/')
      } else {
        const result = await signUpWithPassword(values.email, values.password, rememberMe)
        if (result.kind === 'email_confirmation') {
          const msg = t('auth.emailConfirmHint')
          setMode('login')
          setLegalAccept(false)
          setError(null)
          setInfo(msg)
          setSearchParams({ mode: 'login' }, { replace: true })
          return
        }
        await refreshSync()
        await api.compliance.accept()
        navigate('/onboarding')
      }
    } catch (e) {
      setError(formatAuthError(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthPageLayout>
      <LegalDocumentModal
        kind={legalModalKind}
        open={legalModalKind !== null}
        onClose={() => setLegalModalKind(null)}
      />
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Link to="/home">{t('landing.loginDiscover')}</Link>
          </div>

          <Segmented
            block
            size="large"
            value={mode}
            onChange={(value) => setAuthMode(value as 'login' | 'signup')}
            options={[
              { label: t('auth.modeLogin'), value: 'login' },
              { label: t('auth.modeSignup'), value: 'signup' },
            ]}
          />

          <div>
            <Title level={3} style={{ marginBottom: 4 }}>
              {mode === 'login' ? t('auth.titleLogin') : t('auth.titleSignup')}
            </Title>
            <Text type="secondary">
              {mode === 'login' ? t('auth.subtitleLogin') : t('auth.subtitleSignup')}
            </Text>
          </div>

          {info && <Alert type="info" message={info} showIcon />}
          {error && <Alert type="error" message={error} showIcon />}

          <Checkbox
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          >
            {t('auth.rememberMe')}
          </Checkbox>

          <Button
            block
            size="large"
            icon={<GoogleOutlined />}
            onClick={async () => {
              setError(null)
              try {
                await signInWithGoogle(rememberMe)
              } catch (e) {
                setError(formatAuthError(e))
              }
            }}
          >
            {t('auth.google')}
          </Button>

          <Button
            block
            size="large"
            icon={<WindowsOutlined />}
            onClick={async () => {
              setError(null)
              try {
                await signInWithMicrosoft(rememberMe)
              } catch (e) {
                setError(formatAuthError(e))
              }
            }}
          >
            {t('auth.microsoft')}
          </Button>

          {mode === 'signup' && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t('compliance.oauthHint')}
            </Text>
          )}

          <Divider>{t('auth.emailDivider')}</Divider>

          <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item name="email" label={t('auth.email')} rules={[{ required: true, type: 'email' }]}>
              <Input size="large" autoComplete="email" />
            </Form.Item>
            <Form.Item
              name="password"
              label={t('auth.password')}
              rules={[{ required: true, min: AUTH_PASSWORD_MIN_LENGTH, message: t('auth.passwordMin', { min: AUTH_PASSWORD_MIN_LENGTH }) }]}
              extra={mode === 'signup' ? AUTH_PASSWORD_HINT : undefined}
            >
              <Input.Password size="large" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            </Form.Item>
            {mode === 'signup' && (
              <>
                <Form.Item
                  name="passwordConfirm"
                  label={t('auth.passwordConfirm')}
                  dependencies={['password']}
                  rules={[
                    { required: true, message: t('auth.passwordConfirmRequired') },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) return Promise.resolve()
                        return Promise.reject(new Error(t('auth.passwordMismatch')))
                      },
                    }),
                  ]}
                >
                  <Input.Password size="large" autoComplete="new-password" />
                </Form.Item>
                <Form.Item>
                  <Checkbox checked={legalAccept} onChange={(e) => setLegalAccept(e.target.checked)}>
                    {t('compliance.signupCheckbox')}{' '}
                    <Button type="link" size="small" style={{ padding: 0, height: 'auto' }} onClick={() => openLegal('terms_of_use')}>
                      {t('legal.termsLink')}
                    </Button>
                    {' '}{t('common.and')}{' '}
                    <Button type="link" size="small" style={{ padding: 0, height: 'auto' }} onClick={() => openLegal('privacy_policy')}>
                      {t('legal.privacyLink')}
                    </Button>
                  </Checkbox>
                </Form.Item>
                <Alert type="info" showIcon message={t('auth.emailConfirmHint')} style={{ marginBottom: 16 }} />
              </>
            )}
            <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
              {mode === 'login' ? t('auth.signIn') : t('auth.signUp')}
            </Button>
          </Form>

          <Text type="secondary" style={{ fontSize: 12, textAlign: 'center', display: 'block' }}>
            {LOGIN_LEGAL_KINDS.map((kind, i) => (
              <span key={kind}>
                {i > 0 && ' · '}
                <LegalFooterLink
                  kind={kind}
                  label={
                    kind === 'terms_of_use'
                      ? t('legal.termsLink')
                      : kind === 'privacy_policy'
                        ? t('legal.privacyLink')
                        : t('legal.cookiePolicyLink')
                  }
                  onOpen={openLegal}
                />
              </span>
            ))}
          </Text>
        </Space>
      </Card>
    </AuthPageLayout>
  )
}
