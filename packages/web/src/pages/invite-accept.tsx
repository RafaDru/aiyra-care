import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Alert, Button, Card, Space, Typography, message } from 'antd'
import { api } from '../lib/api.js'
import { useTranslation } from 'react-i18next'

const { Title, Paragraph, Text } = Typography

interface InvitePreview {
  inviteeEmail: string
  patientNames: string[]
  inviterDisplayName: string | null
  circleName?: string | null
  accessLevel: string
  status: string
  expiresAt: string
}

export function InviteAcceptPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''
  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError(t('family.accept.missingToken'))
      setLoading(false)
      return
    }
    api.familyAccess
      .previewInvite(token)
      .then(setPreview)
      .catch(() => setError(t('family.accept.notFound')))
      .finally(() => setLoading(false))
  }, [token, t])

  const accept = async () => {
    if (!token) return
    setAccepting(true)
    try {
      await api.familyAccess.acceptInvite(token)
      message.success(t('family.accept.success'))
      navigate('/')
    } catch (e) {
      message.error(e instanceof Error ? e.message : t('family.accept.error'))
    } finally {
      setAccepting(false)
    }
  }

  if (loading) return <Card loading style={{ maxWidth: 520, margin: '48px auto' }} />

  if (error || !preview) {
    return (
      <Card style={{ maxWidth: 520, margin: '48px auto' }}>
        <Alert type="error" message={error ?? t('family.accept.notFound')} showIcon />
      </Card>
    )
  }

  return (
    <Card style={{ maxWidth: 520, margin: '48px auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={4} style={{ marginTop: 0 }}>{t('family.accept.title')}</Title>
          <Paragraph type="secondary">{t('family.accept.subtitle')}</Paragraph>
        </div>
        <div>
          <Text type="secondary">{t('family.accept.from')}</Text>
          <div><Text strong>{preview.inviterDisplayName ?? t('family.accept.unknownInviter')}</Text></div>
        </div>
        {preview.circleName && (
          <div>
            <Text type="secondary">{t('family.accept.circle')}</Text>
            <div><Text strong>{preview.circleName}</Text></div>
          </div>
        )}
        <div>
          <Text type="secondary">{t('family.accept.profiles')}</Text>
          <div><Text>{preview.patientNames.join(', ')}</Text></div>
        </div>
        <div>
          <Text type="secondary">{t('family.accept.email')}</Text>
          <div><Text>{preview.inviteeEmail}</Text></div>
        </div>
        {preview.status !== 'pending' ? (
          <Alert type="warning" showIcon message={t('family.accept.notPending', { status: preview.status })} />
        ) : (
          <Button type="primary" block loading={accepting} onClick={() => void accept()}>
            {t('family.accept.action')}
          </Button>
        )}
      </Space>
    </Card>
  )
}
