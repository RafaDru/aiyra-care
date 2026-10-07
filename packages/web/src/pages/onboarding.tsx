import { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Alert, Button, Form, Input, Select, Space, Spin, Steps, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext.js'
import { MaskedDatePicker } from '../components/ui/MaskedDatePicker.js'
import { MinorGuardianConsentFormItem } from '../components/legal/MinorGuardianConsentField.js'
import { OnboardingLayout } from '../layouts/OnboardingLayout.js'
import { api } from '../lib/api.js'
import { isMinorBirthDate } from '../lib/patient-age.js'
import { formatCpfInput } from '../lib/input-masks.js'
import { trackProductEvent } from '../lib/product-events.js'
import {
  clearOnboardingWizardStep,
  isOnboardingDependentsStepActive,
  markOnboardingJustCompleted,
  persistOnboardingDependentsStep,
  readOnboardingWizardStep,
} from '../lib/onboarding-wizard-storage.js'
import { isApiResponseError } from '../lib/api-response-error.js'
import { OnboardingErrorAlert } from '../components/onboarding/OnboardingErrorAlert.js'

const { Title, Text } = Typography

const WIZARD_STEP_COUNT = 2

function isAdult(birthDate: Date): boolean {
  const age = (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  return age >= 18
}

type DependentDraft = {
  id: string
  name: string
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
  const [cpfAlreadyLinked, setCpfAlreadyLinked] = useState(false)
  const [dependents, setDependents] = useState<DependentDraft[]>([])
  const dependentBirthDate = Form.useWatch('birthDate', dependentForm)
  const showMinorConsent = dependentBirthDate
    ? isMinorBirthDate(dependentBirthDate.toDate?.() ?? dependentBirthDate)
    : false

  useEffect(() => {
    if (currentStep === 0) {
      trackProductEvent('onboarding_step', { step: 'step_1_viewed' })
    }
  }, [currentStep])

  useEffect(() => {
    if (!needsProfile && isOnboardingDependentsStepActive() && currentStep === 0) {
      setCurrentStep(1)
    }
  }, [needsProfile, currentStep])

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
  // sessionStorage é gravado antes do refreshSync — evita corrida em que needsProfile atualiza antes do setState do passo 2.
  const wizardOnDependentsStep = isOnboardingDependentsStepActive()
  if (!needsProfile && currentStep === 0 && !wizardOnDependentsStep && !submitting) {
    return <Navigate to="/" replace />
  }

  const goToDependentsStep = () => {
    persistOnboardingDependentsStep()
    setCurrentStep(1)
    trackProductEvent('onboarding_step', { step: 'step_2_viewed' })
  }

  const finishOnboarding = (eventStep: 'dependents_skipped' | 'dependents_complete') => {
    clearOnboardingWizardStep()
    markOnboardingJustCompleted()
    trackProductEvent('onboarding_step', { step: eventStep })
    navigate('/')
  }

  const onProfileFinish = async (values: {
    name: string
    birthDate: { toDate: () => Date }
    gender: 'male' | 'female'
    cpf: string
    cns?: string
  }) => {
    setSubmitting(true)
    setError(null)
    setCpfAlreadyLinked(false)
    try {
      await api.auth.completeProfile({
        name: values.name,
        birthDate: values.birthDate.toDate().toISOString(),
        gender: values.gender,
        cpf: values.cpf.replace(/\D/g, ''),
        cns: values.cns?.replace(/\D/g, '') || undefined,
      })
      goToDependentsStep()
      trackProductEvent('onboarding_step', { step: 'profile_complete' })
      await refreshSync()
    } catch (e) {
      clearOnboardingWizardStep()
      setCurrentStep(0)
      if (isApiResponseError(e) && e.code === 'CPF_ALREADY_LINKED') {
        setCpfAlreadyLinked(true)
        setError(null)
      } else {
        setCpfAlreadyLinked(false)
        setError(e instanceof Error ? e.message : t('onboarding.error'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  const onAddDependent = async (values: {
    name: string
    birthDate: { toDate: () => Date }
    gender?: 'male' | 'female'
    cpf?: string
    minorGuardianConsent?: boolean
  }) => {
    setSubmitting(true)
    setError(null)
    setCpfAlreadyLinked(false)
    try {
      const birthDate = values.birthDate.toDate()
      if (isMinorBirthDate(birthDate)) {
        await api.compliance.accept({ kinds: ['minor_guardian_consent'] })
      }
      const created = await api.patients.create({
        name: values.name,
        birthDate: birthDate.toISOString(),
        gender: values.gender || undefined,
        cpf: values.cpf?.replace(/\D/g, '') || undefined,
      })
      setDependents((prev) => [...prev, { id: created.id, name: created.name }])
      dependentForm.resetFields()
      trackProductEvent('onboarding_step', { step: 'dependent_added' })
    } catch (e) {
      if (isApiResponseError(e) && e.code === 'CPF_ALREADY_LINKED') {
        setCpfAlreadyLinked(true)
        setError(null)
      } else {
        setCpfAlreadyLinked(false)
        setError(e instanceof Error ? e.message : t('onboarding.dependentError'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  const stepHuman = currentStep + 1

  return (
    <OnboardingLayout>
      <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
        {t('onboarding.stepProgress', { current: stepHuman, total: WIZARD_STEP_COUNT })}
      </Text>
      <Steps
        current={currentStep}
        style={{ marginBottom: 20 }}
        responsive
        size="small"
        aria-label={t('onboarding.stepsAria')}
        data-testid="onboarding-wizard-steps"
        items={[
          { title: t('onboarding.steps.profile'), description: t('onboarding.steps.profileHint') },
          { title: t('onboarding.steps.dependents'), description: t('onboarding.steps.dependentsHint') },
        ]}
      />

      <OnboardingErrorAlert message={error} cpfAlreadyLinked={cpfAlreadyLinked} />

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
                placeholder={t('onboarding.genderPlaceholder')}
                options={[
                  { value: 'male', label: t('patient.male') },
                  { value: 'female', label: t('patient.female') },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="cpf"
              label={t('onboarding.cpfLabel')}
              rules={[
                { required: true, message: t('onboarding.cpfRequired') },
                { validator: (_, v) => !v || v.replace(/\D/g, '').length === 11 ? Promise.resolve() : Promise.reject(t('onboarding.cpfInvalid')) },
              ]}
            >
              <Input
                placeholder="000.000.000-00"
                maxLength={14}
                onChange={(e) => profileForm.setFieldValue('cpf', formatCpfInput(e.target.value))}
              />
            </Form.Item>
            <Form.Item
              name="cns"
              label={t('onboarding.cnsLabel')}
              extra={t('onboarding.cnsHint')}
            >
              <Input placeholder={t('onboarding.cnsPlaceholder')} maxLength={15} />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
              {t('onboarding.continue')}
            </Button>
          </Form>
        </>
      ) : (
        <div data-testid="onboarding-step-dependents">
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
                placeholder={t('onboarding.genderOptional')}
                options={[
                  { value: 'male', label: t('patient.male') },
                  { value: 'female', label: t('patient.female') },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="cpf"
              label={t('onboarding.cpfOptional')}
              rules={[{ validator: (_, v) => !v || v.replace(/\D/g, '').length === 11 ? Promise.resolve() : Promise.reject(t('onboarding.cpfInvalid')) }]}
            >
              <Input
                placeholder="000.000.000-00"
                maxLength={14}
                onChange={(e) => dependentForm.setFieldValue('cpf', formatCpfInput(e.target.value))}
              />
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
        </div>
      )}
    </OnboardingLayout>
  )
}
