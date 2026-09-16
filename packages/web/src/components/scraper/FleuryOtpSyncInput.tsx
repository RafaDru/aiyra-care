import { useState } from 'react'
import { Alert, Button, Input, Space, Typography } from 'antd'
import { api } from '../../lib/api.js'

const { Text } = Typography

/** Campo OTP in-app — envia código ao browser Playwright do sync Hermes Pardini. */
export function FleuryOtpSyncInput({ jobId }: { jobId: string }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const handleSubmit = async () => {
    const digits = code.replace(/\D/g, '')
    if (digits.length < 4) {
      setError('Digite o código completo (4 a 8 dígitos)')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await api.integrationLinks.submitSyncOtp(jobId, digits)
      setSent(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível enviar o código'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Alert
      type="info"
      showIcon
      style={{ marginBottom: 8, fontSize: 12, textAlign: 'left' }}
      message="Grupo Fleury — código de verificação"
      description={
        <div style={{ marginTop: 4 }}>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
            Enviamos um código por SMS, e-mail ou WhatsApp. Digite abaixo — não é preciso abrir o Chrome.
          </Text>
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Input
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, '').slice(0, 8))
                setSent(false)
              }}
              placeholder="Código de 6 dígitos"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              disabled={loading || sent}
              onPressEnter={() => void handleSubmit()}
            />
            <Button
              type="primary"
              onClick={() => void handleSubmit()}
              loading={loading}
              disabled={sent}
              block
            >
              {sent ? 'Código enviado — aguarde…' : 'Confirmar código'}
            </Button>
            {error && <Text type="danger" style={{ fontSize: 11 }}>{error}</Text>}
          </Space>
        </div>
      }
    />
  )
}
