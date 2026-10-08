import { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button, Form, Input, Select, Spin, Steps, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext.js'
import { MaskedDatePicker } from '../components/ui/MaskedDatePicker.js'
import { OnboardingLayout } from '../layouts/OnboardingLayout.js'
import { httpStatusFromError, reportAccountSettingsFailure } from '../lib/account-settings-errors.js'
import { api } from '../lib/api.js'
import { getBirthDateValidationIssue } from '../lib/birth-date-validation.js'
import { formatCpfInput } from '../lib/input-masks.js'
import { trackProductEvent } from '../lib/product-events.js'
import {
  clearOnboardingWizardStep,
  isOnboardingFamiliesStepActive,
  markOnboardingJustCompleted,
  persistOnboardingFamiliesStep,
  persistOnboardingFamilyWizard,
  readOnboardingFamilyWizard,
  readOnboardingWizardStep,
} from '../lib/onboarding-wizard-storage.js'
import { isApiResponseError } from '../lib/api-response-error.js'
import { OnboardingErrorAlert } from '../components/onboarding/OnboardingErrorAlert.js'
import { OnboardingFamilyLoop } from '../components/onboarding/OnboardingFamilyLoop.js'

const { Title, Text } = Typography

const WIZARD_STEP_COUNT = 3

function isAdult(birthDate: Date): boolean {
  const age = (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  return age >= 18
}

function birthDateRangeMessage(
  issue: ReturnType<typeof getBirthDateValidationIssue>,
  t: (key: string) => string,
): string | null {
  if (!issue) return null
  if (issue === 'future') return t('onboarding.birthDateFuture')
  if (issue === 'too_old') return t('onboarding.birthDateTooOld')
  return t('onboarding.birthDateInvalid')
}

function validateBirthDateField(value: unknown, t: (key: string) => string): Promise<void> {
  if (!value) return Promise.resolve()
  const date = (value as { toDate?: () => Date }).toDate?.() ?? (value as Date)
  const issue = getBirthDateValidationIssue(date)
  const message = birthDateRangeMessage(issue, t)
  return message ? Promise.reject(new Error(message)) : Promise.resolve()
}

export function OnboardingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { configured, loading, needsProfile, refreshSync } = useAuth()
  const [profileForm] = Form.useForm()
  const [currentStep, setCurrentStep] = useState(readOnboardingWizardStep)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cpfAlreadyLinked, setCpfAlreadyLinked] = useState(false)
  const [selfPatientId, setSelfPatientId] = useState<string | null>(null)
  const [selfPatientName, setSelfPatientName] = useState('')
  const [familyBootstrap, setFamilyBootstrap] = useState<{
    phase: 'name' | 'members'
    circleIndex: number
    activeCircleId: string | null
    circleNames: string[]
  } | null>(null)
  const [familyReady, setFamilyReady] = useState(false)

  useEffect(() => {
    if (currentStep === 0) {
      trackProductEvent('onboarding_step', { step: 'step_1_viewed' })
    }
  }, [currentStep])

  useEffect(() => {
    if (!needsProfile && isOnboardingFamiliesStepActive() && currentStep === 0) {
      setCurrentStep(1)
    }
  }, [needsProfile, currentStep])

  useEffect(() => {
    if (currentStep !== 1 || familyReady) return
    const stored = readOnboardingFamilyWizard()
    if (stored) {
      setFamilyBootstrap(stored)
      setFamilyReady(true)
      return
    }
    api.careCircles
      .list()
      .then((circles) => {
        if (circles.length === 0) {
          setFamilyBootstrap({
            phase: 'name',
            circleIndex: 0,
            activeCircleId: null,
            circleNames: [],
          })
        } else {
          const names = circles.map((c) => c.name)
          const last = circles[circles.length - 1]!
          setFamilyBootstrap({
            phase: 'members',
            circleIndex: circles.length - 1,
            activeCircleId: last.id,
            circleNames: names,
          })
          persistOnboardingFamilyWizard({
            phase: 'members',
            circleIndex: circles.length - 1,
            activeCircleId: last.id,
            circleNames: names,
          })
        }
      })
      .catch(() => {
        setFamilyBootstrap({
          phase: 'name',
          circleIndex: 0,
          activeCircleId: null,
          circleNames: [],
        })
      })
      .finally(() => setFamilyReady(true))
  }, [currentStep, familyReady])

  useEffect(() => {
    if (currentStep !== 1 || selfPatientId) return
    api.patients
      .list()
      .then((rows) => {
        const self = rows.find((p) => p.membershipRole === 'self') ?? rows[0]
        if (self) {
          setSelfPatientId(self.id)
          setSelfPatientName(self.name)
        }
      })
      .catch(() => undefined)
  }, [currentStep, selfPatientId])

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

  const wizardOnFamiliesStep = isOnboardingFamiliesStepActive()
  if (!needsProfile && currentStep === 0 && !wizardOnFamiliesStep && !submitting) {
    return <Navigate to="/" replace />
  }

  const goToFamiliesStep = (patientId: string, patientName: string) => {
    setSelfPatientId(patientId)
    setSelfPatientName(patientName)
    persistOnboardingFamiliesStep()
    persistOnboardingFamilyWizard({
      phase: 'name',
      circleIndex: 0,
      activeCircleId: null,
      circleNames: [],
    })
    setFamilyBootstrap({
      phase: 'name',
      circleIndex: 0,
      activeCircleId: null,
      circleNames: [],
    })
    setFamilyReady(true)
    setCurrentStep(1)
    trackProductEvent('onboarding_step', { step: 'step_3_family_name_viewed', circle_index: 0 })
  }

  const finishOnboarding = () => {
    clearOnboardingWizardStep()
    markOnboardingJustCompleted()
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
      const result = await api.auth.completeProfile({
        name: values.name,
        birthDate: values.birthDate.toDate().toISOString(),
        gender: values.gender,
        cpf: values.cpf.replace(/\D/g, ''),
        cns: values.cns?.replace(/\D/g, '') || undefined,
      })
      trackProductEvent('onboarding_step', { step: 'profile_complete' })
      await refreshSync()
      goToFamiliesStep(result.patient.id, result.patient.name)
    } catch (e) {
      const status = httpStatusFromError(e)
      if (status) {
        reportAccountSettingsFailure('profile_save', {
          apiPath: '/auth/complete-profile',
          status,
          message: e instanceof Error ? e.message : undefined,
        })
      }
      clearOnboardingWizardStep()
      setCurrentStep(0)
      setFamilyReady(false)
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

  const stepsCurrent = currentStep === 0 ? 0 : 1

  return (
    <OnboardingLayout>
      <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
        {t('onboarding.stepProgress', { current: stepsCurrent + 1, total: WIZARD_STEP_COUNT })}
      </Text>
      <Steps
        current={stepsCurrent}
        style={{ marginBottom: 20 }}
        responsive
        size="small"
        aria-label={t('onboarding.stepsAria')}
        data-testid="onboarding-wizard-steps"
        items={[
          { title: t('onboarding.steps.profile'), description: t('onboarding.steps.profileHint') },
          { title: t('onboarding.steps.families'), description: t('onboarding.steps.familiesHint') },
          { title: t('onboarding.steps.complete'), description: t('onboarding.steps.completeHint') },
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
                  validator: (_, value) => validateBirthDateField(value, t),
                },
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve()
                    const date = value.toDate?.() ?? value
                    return isAdult(date) ? Promise.resolve() : Promise.reject(new Error(t('onboarding.adultOnly')))
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
      ) : familyReady && selfPatientId && familyBootstrap ? (
        <OnboardingFamilyLoop
          selfPatientId={selfPatientId}
          selfPatientName={selfPatientName}
          initialPhase={familyBootstrap.phase}
          initialCircleIndex={familyBootstrap.circleIndex}
          initialActiveCircleId={familyBootstrap.activeCircleId}
          initialCircleNames={familyBootstrap.circleNames}
          submitting={submitting}
          setSubmitting={setSubmitting}
          onFinish={finishOnboarding}
        />
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      )}
    </OnboardingLayout>
  )
}
