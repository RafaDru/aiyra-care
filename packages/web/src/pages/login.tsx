import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Checkbox, Divider, Form, Input, Space, Typography } from 'antd'
import { GoogleOutlined, WindowsOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext.js'
import { formatAuthError } from '../lib/auth-errors.js'
import { AuthPageLayout } from '../layouts/AuthPageLayout.js'

const { Title, Text } = Typography

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const {
    configured,
    rememberMe,
    setRememberMe,
    signInWithGoogle,
    signInWithMicrosoft,
    signInWithPassword,
    signUpWithPassword,
  } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [submitting, setSubmitting] = useState(false)

  if (!configured) {
    return (
      <AuthPageLayout>
        <Alert
          type="warning"
          message={t('auth.notConfigured')}
          description={t('auth.notConfiguredHint')}
        />
      </AuthPageLayout>
    )
  }

  const onFinish = async (values: { email: string; password: string }) => {
    setSubmitting(true)
    setError(null)
    try {
      if (mode === 'login') {
        await signInWithPassword(values.email, values.password, rememberMe)
        navigate('/')
      } else {
        await signUpWithPassword(values.email, values.password, rememberMe)
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
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={3} style={{ marginBottom: 4 }}>{t('auth.title')}</Title>
            <Text type="secondary">{t('auth.subtitle')}</Text>
          </div>

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

          <Divider>{t('auth.emailDivider')}</Divider>

          <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item name="email" label={t('auth.email')} rules={[{ required: true, type: 'email' }]}>
              <Input size="large" autoComplete="email" />
            </Form.Item>
            <Form.Item name="password" label={t('auth.password')} rules={[{ required: true, min: 6 }]}>
              <Input.Password size="large" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
              {mode === 'login' ? t('auth.signIn') : t('auth.signUp')}
            </Button>
          </Form>

          <Button type="link" block onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
            {mode === 'login' ? t('auth.switchToSignUp') : t('auth.switchToSignIn')}
          </Button>
        </Space>
      </Card>
    </AuthPageLayout>
  )
}
