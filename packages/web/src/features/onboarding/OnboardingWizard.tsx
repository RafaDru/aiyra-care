import { useEffect, useState } from 'react'
import { Form, Spin } from 'antd'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.js'
import { OnboardingErrorAlert } from '../../components/onboarding/OnboardingErrorAlert.js'
import { httpStatusFromError, reportAccountSettingsFailure } from '../../lib/account-settings-errors.js'
import { api } from '../../lib/api.js'
import { trackProductEvent } from '../../lib/product-events.js'
import {
  clearOnboardingWizardStep,
  isOnboardingFamiliesStepActive,
  markOnboardingJustCompleted,
  persistOnboardingFamiliesStep,
  persistOnboardingFamilyWizard,
  readOnboardingFamilyWizard,
  readOnboardingWizardStep,
} from '../../lib/onboarding-wizard-storage.js'
import { isApiResponseError } from '../../lib/api-response-error.js'
import { OnboardingStepChrome } from './OnboardingStepChrome.js'
import { ProfileStep, type ProfileStepValues } from './steps/ProfileStep.js'
import { FamilyWizardStep } from './steps/FamilyWizardStep.js'

export function OnboardingWizard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { needsProfile, refreshSync } = useAuth()
  const [profileForm] = Form.useForm<ProfileStepValues>()
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

  const onProfileFinish = async (values: ProfileStepValues) => {
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
      if (values.socialName?.trim()) {
        trackProductEvent('onboarding_step', { step: 'social_name_captured_ui', skipped: false })
      }
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

  const wizardOnFamiliesStep = isOnboardingFamiliesStepActive()
  if (!needsProfile && currentStep === 0 && !wizardOnFamiliesStep && !submitting) {
    return <Navigate to="/" replace />
  }

  const stepsCurrent = currentStep === 0 ? 0 : 1

  return (
    <OnboardingStepChrome stepsCurrent={stepsCurrent}>
      <OnboardingErrorAlert message={error} cpfAlreadyLinked={cpfAlreadyLinked} />

      {currentStep === 0 ? (
        <ProfileStep form={profileForm} submitting={submitting} onFinish={onProfileFinish} />
      ) : familyReady && selfPatientId && familyBootstrap ? (
        <FamilyWizardStep
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
    </OnboardingStepChrome>
  )
}
