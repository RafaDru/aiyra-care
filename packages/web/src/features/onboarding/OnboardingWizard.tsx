import { useEffect, useRef, useState } from 'react'
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
  isOnboardingConnectorsStepActive,
  isOnboardingFamiliesStepActive,
  markOnboardingJustCompleted,
  persistOnboardingConnectorsStep,
  persistOnboardingFamiliesStep,
  persistOnboardingFamilyWizard,
  persistOnboardingWizardOwnerSub,
  readOnboardingFamilyWizard,
  readOnboardingWizardStep,
} from '../../lib/onboarding-wizard-storage.js'
import { isApiResponseError } from '../../lib/api-response-error.js'
import { ONBOARDING_CONNECTOR_STEPS } from './onboarding-catalog.js'
import { OnboardingStepChrome } from './OnboardingStepChrome.js'
import { ProfileStep } from './steps/ProfileStep.js'
import { AddressContactStep } from './steps/AddressContactStep.js'
import type { OnboardingProfileFormValues } from './profile-form.types.js'
import { FamilyWizardStep } from './steps/FamilyWizardStep.js'
import { ConnectorWizardStep } from './steps/ConnectorWizardStep.js'

export function OnboardingWizard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { needsProfile, refreshSync, account, authUserId } = useAuth()

  const bindWizardOwner = () => {
    if (authUserId) persistOnboardingWizardOwnerSub(authUserId)
  }
  const [profileForm] = Form.useForm<OnboardingProfileFormValues>()
  const profileIdentityRef = useRef<Partial<OnboardingProfileFormValues>>({})
  const [currentStep, setCurrentStep] = useState(readOnboardingWizardStep)
  const [profileSubStep, setProfileSubStep] = useState<'identity' | 'address'>('identity')
  const [connectorIndex, setConnectorIndex] = useState(0)
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
    if (currentStep === 0 && profileSubStep === 'identity') {
      trackProductEvent('onboarding_step', { step: 'identity-names' })
    }
  }, [currentStep, profileSubStep])

  useEffect(() => {
    if (!needsProfile && isOnboardingFamiliesStepActive() && currentStep === 0) {
      setCurrentStep(1)
    }
    if (!needsProfile && isOnboardingConnectorsStepActive() && currentStep < 2) {
      setCurrentStep(2)
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
    if ((currentStep === 1 || currentStep === 2) && !selfPatientId) {
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
    }
  }, [currentStep, selfPatientId])

  const goToFamiliesStep = (patientId: string, patientName: string) => {
    setSelfPatientId(patientId)
    setSelfPatientName(patientName)
    bindWizardOwner()
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

  const goToConnectorsStep = () => {
    bindWizardOwner()
    persistOnboardingConnectorsStep()
    setConnectorIndex(0)
    setCurrentStep(2)
    trackProductEvent('onboarding_step', { step: 'connector-sus' })
  }

  const finishOnboarding = () => {
    clearOnboardingWizardStep()
    markOnboardingJustCompleted()
    navigate('/')
  }

  const onProfileIdentityContinue = async () => {
    try {
      const identity = await profileForm.validateFields(['name', 'birthDate', 'gender', 'cpf', 'socialName', 'cns'])
      profileIdentityRef.current = identity
      setProfileSubStep('address')
      trackProductEvent('onboarding_step', { step: 'address' })
    } catch {
      // validation messages shown in form
    }
  }

  const onProfileFinish = async (addressValues: OnboardingProfileFormValues) => {
    setSubmitting(true)
    setError(null)
    setCpfAlreadyLinked(false)
    try {
      const values = {
        ...profileIdentityRef.current,
        ...profileForm.getFieldsValue(true),
        ...addressValues,
      } as OnboardingProfileFormValues
      if (!values.name?.trim() || !values.birthDate || !values.gender || !values.cpf?.trim()) {
        throw new Error('Dados de identidade ausentes ao salvar endereço — recarregue o passo inicial.')
      }
      const result = await api.auth.completeProfile({
        name: values.name,
        socialName: values.socialName?.trim() || undefined,
        birthDate: values.birthDate.toDate().toISOString(),
        gender: values.gender,
        cpf: values.cpf.replace(/\D/g, ''),
        cns: values.cns?.replace(/\D/g, '') || undefined,
        phone: values.mobilePhone.replace(/\D/g, ''),
        phoneSecondary: values.phoneSecondary?.replace(/\D/g, '') || undefined,
        phoneIsWhatsapp: values.phoneIsWhatsapp,
        address: {
          postalCode: values.postalCode.replace(/\D/g, ''),
          street: values.street.trim(),
          number: values.streetNumber.trim(),
          complement: values.addressComplement?.trim() || undefined,
          district: values.district.trim(),
          city: values.city.trim(),
          state: values.state,
        },
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
      setProfileSubStep('identity')
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
  const wizardOnConnectorsStep = isOnboardingConnectorsStepActive()
  if (!needsProfile && currentStep === 0 && !wizardOnFamiliesStep && !wizardOnConnectorsStep && !submitting) {
    return <Navigate to="/" replace />
  }

  const stepsCurrent = currentStep === 0 ? 0 : currentStep === 1 ? 1 : 2

  const advanceConnector = () => {
    if (connectorIndex >= ONBOARDING_CONNECTOR_STEPS.length - 1) {
      finishOnboarding()
      return
    }
    setConnectorIndex((i) => i + 1)
  }

  return (
    <OnboardingStepChrome stepsCurrent={stepsCurrent}>
      <OnboardingErrorAlert message={error} cpfAlreadyLinked={cpfAlreadyLinked} />

      {currentStep === 0 ? (
        profileSubStep === 'identity' ? (
          <ProfileStep form={profileForm} submitting={submitting} onContinue={() => void onProfileIdentityContinue()} />
        ) : (
          <AddressContactStep
            form={profileForm}
            submitting={submitting}
            accountEmail={account?.email}
            onFinish={(v) => void onProfileFinish(v)}
          />
        )
      ) : currentStep === 1 && familyReady && selfPatientId && familyBootstrap ? (
        <FamilyWizardStep
          selfPatientId={selfPatientId}
          selfPatientName={selfPatientName}
          initialPhase={familyBootstrap.phase}
          initialCircleIndex={familyBootstrap.circleIndex}
          initialActiveCircleId={familyBootstrap.activeCircleId}
          initialCircleNames={familyBootstrap.circleNames}
          submitting={submitting}
          setSubmitting={setSubmitting}
          onFinish={goToConnectorsStep}
        />
      ) : currentStep === 2 && selfPatientId ? (
        <ConnectorWizardStep
          kind={ONBOARDING_CONNECTOR_STEPS[connectorIndex]!.id}
          connectorIndex={connectorIndex}
          selfPatientId={selfPatientId}
          onSkip={advanceConnector}
          onContinue={advanceConnector}
          isLast={connectorIndex >= ONBOARDING_CONNECTOR_STEPS.length - 1}
        />
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      )}
    </OnboardingStepChrome>
  )
}
