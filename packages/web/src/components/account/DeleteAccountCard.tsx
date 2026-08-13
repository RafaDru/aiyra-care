import { useState } from 'react'
import { Alert, Button, Card, Input, Modal, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext.js'
import { api } from '../../lib/api.js'

const { Text, Paragraph } = Typography

export function DeleteAccountCard() {
  const { t } = useTranslation()
  const { signOut, user, account } = useAuth()
  const [open, setOpen] = useState(false)
  const [confirmPhrase, setConfirmPhrase] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const email = account?.email ?? user?.email ?? ''

  const onDelete = async () => {
    if (confirmPhrase !== 'EXCLUIR') {
      setError(t('accountPlan.deleteConfirmError'))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await api.auth.deleteAccount({ confirmPhrase: 'EXCLUIR' })
      setOpen(false)
      await signOut()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('accountPlan.deleteError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <Typography.Title level={5} style={{ marginTop: 0 }}>{t('accountPlan.deleteTitle')}</Typography.Title>
      <Paragraph type="secondary" style={{ marginBottom: 12 }}>
        {t('accountPlan.deleteHint')}
      </Paragraph>
      <Button danger onClick={() => { setOpen(true); setConfirmPhrase(''); setError(null) }}>
        {t('accountPlan.deleteButton')}
      </Button>

      <Modal
        title={t('accountPlan.deleteModalTitle')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onDelete}
        okText={t('accountPlan.deleteConfirmButton')}
        okButtonProps={{ danger: true, disabled: confirmPhrase !== 'EXCLUIR', loading: submitting }}
        cancelText={t('common.cancel')}
      >
        <Alert type="warning" showIcon message={t('accountPlan.deleteWarning')} style={{ marginBottom: 16 }} />
        <Text type="secondary">{t('accountPlan.deleteTypeConfirm')}</Text>
        {email && (
          <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
            {t('accountPlan.email')}: {email}
          </Text>
        )}
        <Input
          style={{ marginTop: 12 }}
          value={confirmPhrase}
          onChange={(e) => setConfirmPhrase(e.target.value)}
          placeholder="EXCLUIR"
          autoComplete="off"
        />
        {error && <Alert type="error" message={error} showIcon style={{ marginTop: 12 }} />}
      </Modal>
    </Card>
  )
}
