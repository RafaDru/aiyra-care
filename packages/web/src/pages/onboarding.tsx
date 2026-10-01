import { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Form, Input, Select, Space, Spin, Steps, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext.js'
import { MaskedDatePicker } from '../components/ui/MaskedDatePicker.js'
import { MinorGuardianConsentFormItem } from '../components/legal/MinorGuardianConsentField.js'
import { OnboardingLayout } from '../layouts/OnboardingLayout.js'
import { api } from '../lib/api.js'
import { isMinorBirthDate } from '../lib/patient-age.js'
import { trackProductEvent } from '../lib/product-events.js'

const { Title, Text } = Typography

function isAdult(birthDate: Date): boolean {
  const age = (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  return age >= 18
}

type DependentDraft = {
  id: string
  name: string
}

const ONBOARDING_WIZARD_STEP_KEY = 'aiyracare.onboarding_wizard_step'

function readOnboardingWizardStep(): number {
  if (typeof window === 'undefined') return 0
  return sessionStorage.getItem(ONBOARDING_WIZARD_STEP_KEY) === '1' ? 1 : 0
}

export function OnboardingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { configured, loading, needsProfile, refreshSync } = useAuth()
  const [profileForm] = Form.useForm()
  const [dependentForm] = Form.useForm()
  const [currentStep, setCurrentStep] = useState(readOnboardingWizardStep)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dependents, setDependents] = useState<DependentDraft[]>([])
  const dependentBirthDate = Form.useWatch('birthDate', dependentForm)
  const showMinorConsent = dependentBirthDate
    ? isMinorBirthDate(dependentBirthDate.toDate?.() ?? dependentBirthDate)
    : false

  useEffect(() => {
    trackProductEvent('onboarding_step', { step: 'step_1_viewed' })
  }, [])

  if (!configured) return <Navigate to="/" replace />

  if (loading) {
    return (
      <OnboardingLayout>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      </OnboardingLayout>
    )
  }

  // Após completeProfile, needsProfile fica false mas o passo de dependentes ainda deve aparecer.
  if (!needsProfile && currentStep === 0) return <Navigate to="/" replace />

  const goToDependentsStep = () => {
    sessionStorage.setItem(ONBOARDING_WIZARD_STEP_KEY, '1')
    setCurrentStep(1)
    trackProductEvent('onboarding_step', { step: 'step_2_viewed' })
  }

  const finishOnboarding = (eventStep: 'dependents_skipped' | 'dependents_complete') => {
    sessionStorage.removeItem(ONBOARDING_WIZARD_STEP_KEY)
    trackProductEvent('onboarding_step', { step: eventStep })
    navigate('/')
  }

  const onProfileFinish = async (values: {
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
      trackProductEvent('onboarding_step', { step: 'profile_complete' })
      goToDependentsStep()
      await refreshSync()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('onboarding.error'))
    } finally {
      setSubmitting(false)
    }
  }

  const onAddDependent = async (values: {
    name: string
    birthDate: { toDate: () => Date }
    gender?: 'male' | 'female'
    cpf?: string
    weightKg?: string
    heightCm?: string
    minorGuardianConsent?: boolean
  }) => {
    setSubmitting(true)
    setError(null)
    try {
      const birthDate = values.birthDate.toDate()
      if (isMinorBirthDate(birthDate)) {
        await api.compliance.accept({ kinds: ['minor_guardian_consent'] })
      }
      const created = await api.patients.create({
        name: values.name,
        birthDate: birthDate.toISOString(),
        gender: values.gender || undefined,
        weightKg: values.weightKg ? Number(values.weightKg) : undefined,
        heightCm: values.heightCm ? Number(values.heightCm) : undefined,
        cpf: values.cpf?.replace(/\D/g, '') || undefined,
      })
      setDependents((prev) => [...prev, { id: created.id, name: created.name }])
      dependentForm.resetFields()
      trackProductEvent('onboarding_step', { step: 'dependent_added' })
    } catch (e) {
      setError(e instanceof Error ? e.message : t('onboarding.dependentError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <OnboardingLayout>
      <Steps
        current={currentStep}
        style={{ marginBottom: 24 }}
        responsive
        items={[
          { title: t('onboarding.steps.profile') },
          { title: t('onboarding.steps.dependents') },
        ]}
      />

      <Card variant="borderless" styles={{ body: { padding: 0 } }}>
        {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

        {currentStep === 0 ? (
          <>
            <Title level={3} style={{ marginBottom: 4 }}>{t('onboarding.welcomeTitle')}</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>{t('onboarding.welcomeSubtitle')}</Text>

            <Form form={profileForm} layout="vertical" onFinish={onProfileFinish} requiredMark={false}>
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
              <Form.Item
                name="cns"
                label={t('onboarding.cnsLabel')}
                extra={t('onboarding.cnsHint')}
              >
                <Input placeholder={t('onboarding.cnsPlaceholder')} maxLength={15} />
              </Form.Item>
              <Form.Item name="weightKg" label={t('onboarding.weightOptional')}>
                <Input type="number" step="0.1" addonAfter={t('patient.weight')} />
              </Form.Item>
              <Form.Item name="heightCm" label={t('onboarding.heightOptional')}>
                <Input type="number" step="0.1" addonAfter={t('patient.height')} />
              </Form.Item>
              <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
                {t('onboarding.continue')}
              </Button>
            </Form>
          </>
        ) : (
          <>
            <Title level={3} style={{ marginBottom: 4 }}>{t('onboarding.dependentsTitle')}</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>{t('onboarding.dependentsSubtitle')}</Text>

            {dependents.length > 0 && (
              <Alert
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
                message={t('onboarding.dependentsAdded', { count: dependents.length })}
                description={dependents.map((d) => d.name).join(', ')}
              />
            )}

            <Form form={dependentForm} layout="vertical" onFinish={onAddDependent} requiredMark={false}>
              <Form.Item name="name" label={t('onboarding.dependentName')} rules={[{ required: true, message: t('onboarding.nameRequired') }]}>
                <Input size="large" />
              </Form.Item>
              <Form.Item name="birthDate" label={t('onboarding.birthDate')} rules={[{ required: true, message: t('onboarding.birthDateRequired') }]}>
                <MaskedDatePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="gender" label={t('onboarding.gender')}>
                <Select
                  size="large"
                  allowClear
                  options={[
                    { value: 'male', label: t('patient.male') },
                    { value: 'female', label: t('patient.female') },
                  ]}
                />
              </Form.Item>
              <Form.Item name="weightKg" label={t('onboarding.weightOptional')}>
                <Input type="number" step="0.1" addonAfter={t('patient.weight')} />
              </Form.Item>
              <Form.Item name="heightCm" label={t('onboarding.heightOptional')}>
                <Input type="number" step="0.1" addonAfter={t('patient.height')} />
              </Form.Item>
              <Form.Item
                name="cpf"
                label="CPF"
                rules={[{ validator: (_, v) => !v || v.replace(/\D/g, '').length === 11 ? Promise.resolve() : Promise.reject(t('onboarding.cpfInvalid')) }]}
              >
                <Input placeholder="000.000.000-00" maxLength={14} />
              </Form.Item>
              {showMinorConsent && <MinorGuardianConsentFormItem />}
              <Button type="default" htmlType="submit" block size="large" loading={submitting}>
                {t('onboarding.addDependent')}
              </Button>
            </Form>

            <Space direction="vertical" style={{ width: '100%', marginTop: 16 }}>
              <Button
                type="primary"
                block
                size="large"
                disabled={dependents.length === 0}
                onClick={() => finishOnboarding('dependents_complete')}
              >
                {t('onboarding.finish')}
              </Button>
              <Button type="link" block onClick={() => finishOnboarding('dependents_skipped')}>
                {t('onboarding.skipDependents')}
              </Button>
            </Space>
          </>
        )}
      </Card>
    </OnboardingLayout>
  )
}
