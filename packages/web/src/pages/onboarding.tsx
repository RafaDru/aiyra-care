import { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Form, Input, Select, Spin, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext.js'
import { MaskedDatePicker } from '../components/ui/MaskedDatePicker.js'
import { AuthPageLayout } from '../layouts/AuthPageLayout.js'
import { api } from '../lib/api.js'
import { trackProductEvent } from '../lib/product-events.js'

const { Title, Text } = Typography

function isAdult(birthDate: Date): boolean {
  const age = (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  return age >= 18
}

export function OnboardingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { configured, loading, needsProfile, refreshSync } = useAuth()
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    trackProductEvent('onboarding_step', { step: 'profile_form_viewed' })
  }, [])

  if (!configured) return <Navigate to="/" replace />

  if (loading) {
    return (
      <AuthPageLayout>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      </AuthPageLayout>
    )
  }

  if (!needsProfile) return <Navigate to="/" replace />

  const onFinish = async (values: {
    name: string
    birthDate: { toDate: () => Date }
    gender: 'male' | 'female'
    cpf: string
    cns?: string
    weightKg?: string
    heightCm?: string
  }) => {
    setSubmitting(true)
    setError(null)
    try {
      await api.auth.completeProfile({
        name: values.name,
        birthDate: values.birthDate.toDate().toISOString(),
        gender: values.gender,
        cpf: values.cpf.replace(/\D/g, ''),
        cns: values.cns?.replace(/\D/g, '') || undefined,
        weightKg: values.weightKg ? Number(values.weightKg) : undefined,
        heightCm: values.heightCm ? Number(values.heightCm) : undefined,
      })
      await refreshSync()
      trackProductEvent('onboarding_step', { step: 'profile_complete' })
      navigate('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : t('onboarding.error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthPageLayout>
      <Card>
        <Title level={3} style={{ marginBottom: 4 }}>{t('onboarding.title')}</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>{t('onboarding.subtitle')}</Text>

        {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item name="name" label={t('onboarding.name')} rules={[{ required: true, message: t('onboarding.nameRequired') }]}>
            <Input size="large" autoComplete="name" />
          </Form.Item>
          <Form.Item
            name="birthDate"
            label={t('onboarding.birthDate')}
            rules={[
              { required: true, message: t('onboarding.birthDateRequired') },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve()
                  const date = value.toDate?.() ?? value
                  return isAdult(date) ? Promise.resolve() : Promise.reject(t('onboarding.adultOnly'))
                },
              },
            ]}
          >
            <MaskedDatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="gender" label={t('onboarding.gender')} rules={[{ required: true, message: t('onboarding.genderRequired') }]}>
            <Select
              size="large"
              options={[
                { value: 'male', label: t('patient.male') },
                { value: 'female', label: t('patient.female') },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="cpf"
            label="CPF"
            rules={[
              { required: true, message: t('onboarding.cpfRequired') },
              { validator: (_, v) => !v || v.replace(/\D/g, '').length === 11 ? Promise.resolve() : Promise.reject(t('onboarding.cpfInvalid')) },
            ]}
          >
            <Input placeholder="000.000.000-00" maxLength={14} />
          </Form.Item>
          <Form.Item name="cns" label="CNS">
            <Input placeholder={t('onboarding.cnsPlaceholder')} maxLength={15} />
          </Form.Item>
          <Form.Item name="weightKg" label={`${t('onboarding.weight')} (${t('patient.weight')})`}>
            <Input type="number" step="0.1" />
          </Form.Item>
          <Form.Item name="heightCm" label={`${t('onboarding.height')} (${t('patient.height')})`}>
            <Input type="number" step="0.1" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
            {t('onboarding.submit')}
          </Button>
        </Form>
      </Card>
    </AuthPageLayout>
  )
}
