import { useState } from 'react'
import { Alert, Button, Card, Form, Input, Space, Spin, Typography } from 'antd'
import { GoogleOutlined, MailOutlined } from '@ant-design/icons'
import { ChHubCareLogo } from './components/ChHubCareLogo.js'
import { useChOperatorAuth } from './contexts/ChOperatorAuthContext.js'

const { Title, Paragraph, Text } = Typography

export function ChOperatorLogin() {
  const { status, authError, signInWithOtp, signInWithGoogle } = useChOperatorAuth()
  const [email, setEmail] = useState('')
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onMagicLink = async () => {
    setSubmitting(true)
    setError(null)
    setInfo(null)
    try {
      await signInWithOtp(email)
      setInfo('Enviamos um link mágico — abra o e-mail neste navegador.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao enviar link')
    } finally {
      setSubmitting(false)
    }
  }

  const onGoogle = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao iniciar Google')
      setSubmitting(false)
    }
  }

  return (
    <div className="ch-layout ch-operator-login">
      <Card style={{ maxWidth: 440, width: '100%', margin: 'auto' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <ChHubCareLogo />
            <Title level={3} style={{ marginTop: 16, marginBottom: 0 }}>
              Command Hub
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              Acesso restrito a operadores autorizados.
            </Paragraph>
          </div>

          {(error || authError) && (
            <Alert type="error" showIcon message={error ?? authError ?? 'Erro de autenticação'} />
          )}
          {info && <Alert type="success" showIcon message={info} />}
          {status && !status.allowlistConfigured && (
            <Alert
              type="warning"
              showIcon
              message="Allowlist de operadores não configurada no servidor (OPS_CONSOLE_OPERATOR_EMAILS)."
            />
          )}

          <Form layout="vertical" onFinish={onMagicLink}>
            <Form.Item label="E-mail corporativo" required>
              <Input
                type="email"
                prefix={<MailOutlined />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operador@seudominio.com"
                autoComplete="email"
              />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={submitting}
              disabled={!email.trim()}
            >
              Enviar link mágico
            </Button>
          </Form>

          <Button icon={<GoogleOutlined />} block onClick={onGoogle} loading={submitting}>
            Continuar com Google
          </Button>

          <Text type="secondary" style={{ fontSize: 12 }}>
            Use a mesma conta Supabase do app Ananeri. Apenas e-mails em OPS_CONSOLE_OPERATOR_EMAILS
            entram no CH.
          </Text>
        </Space>
      </Card>
    </div>
  )
}

export function ChOperatorAuthGate({ children }: { children: React.ReactNode }) {
  const { loading, status, session, operatorEmail } = useChOperatorAuth()

  if (loading) {
    return (
      <div className="ch-layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (status?.enabled && (!session || !operatorEmail)) {
    return <ChOperatorLogin />
  }

  return <>{children}</>
}