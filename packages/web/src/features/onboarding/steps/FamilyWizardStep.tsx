import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Checkbox, Form, Input, Select, Space, Tag, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { MaskedDatePicker } from '../../../components/ui/MaskedDatePicker.js'
import { MinorGuardianConsentFormItem } from '../../../components/legal/MinorGuardianConsentField.js'
import { api } from '../../../lib/api.js'
import { isMinorBirthDate } from '../../../lib/patient-age.js'
import { formatCpfInput } from '../../../lib/input-masks.js'
import { trackProductEvent } from '../../../lib/product-events.js'
import { isApiResponseError } from '../../../lib/api-response-error.js'
import {
  defaultFamilyCircleName,
  persistOnboardingFamilyWizard,
  type OnboardingFamilyPhase,
} from '../../../lib/onboarding-wizard-storage.js'
import { OnboardingErrorAlert } from '../../../components/onboarding/OnboardingErrorAlert.js'

const { Title, Text } = Typography

type MemberDraft = { id: string; name: string }

export type FamilyWizardStepProps = {
  selfPatientId: string
  selfPatientName: string
  initialPhase: OnboardingFamilyPhase
  initialCircleIndex: number
  initialActiveCircleId: string | null
  initialCircleNames: string[]
  submitting: boolean
  setSubmitting: (v: boolean) => void
  onFinish: () => void
}

export function FamilyWizardStep({
  selfPatientId,
  selfPatientName,
  initialPhase,
  initialCircleIndex,
  initialActiveCircleId,
  initialCircleNames,
  submitting,
  setSubmitting,
  onFinish,
}: FamilyWizardStepProps) {
  const { t } = useTranslation()
  const [nameForm] = Form.useForm<{ name: string }>()
  const [memberForm] = Form.useForm()
  const [phase, setPhase] = useState<OnboardingFamilyPhase>(initialPhase)
  const [circleIndex, setCircleIndex] = useState(initialCircleIndex)
  const [activeCircleId, setActiveCircleId] = useState<string | null>(initialActiveCircleId)
  const [circleNames, setCircleNames] = useState(initialCircleNames)
  const [activeCircleName, setActiveCircleName] = useState('')
  const [members, setMembers] = useState<MemberDraft[]>([])
  const [includeSelf, setIncludeSelf] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cpfAlreadyLinked, setCpfAlreadyLinked] = useState(false)

  const memberBirthDate = Form.useWatch('birthDate', memberForm)
  const showMinorConsent = memberBirthDate
    ? isMinorBirthDate(memberBirthDate.toDate?.() ?? memberBirthDate)
    : false

  const persist = () => {
    persistOnboardingFamilyWizard({
      phase,
      circleIndex,
      activeCircleId,
      circleNames,
    })
  }

  useEffect(() => {
    persist()
  }, [phase, circleIndex, activeCircleId, circleNames])

  useEffect(() => {
    if (phase === 'name') {
      trackProductEvent('onboarding_step', { step: 'step_3_family_name_viewed', circle_index: circleIndex })
      const suggestion = defaultFamilyCircleName(selfPatientName, circleIndex, circleNames)
      nameForm.setFieldsValue({ name: nameForm.getFieldValue('name') || suggestion })
    }
  }, [phase, circleIndex, selfPatientName, circleNames, nameForm])

  const loadCircleMembers = async (circleId: string) => {
    const detail = await api.careCircles.get(circleId)
    setActiveCircleName(detail.name)
    setMembers(
      detail.patients
        .filter((p) => p.patientId !== selfPatientId)
        .map((p) => ({ id: p.patientId, name: p.patientName })),
    )
    const selfLinked = detail.patients.some((p) => p.patientId === selfPatientId)
    setIncludeSelf(selfLinked)
  }

  useEffect(() => {
    if (phase !== 'members' || !activeCircleId) return
    loadCircleMembers(activeCircleId).catch(() => undefined)
  }, [phase, activeCircleId, selfPatientId])

  const familyProgressLabel = t('onboarding.familyIndexProgress', {
    current: circleIndex + 1,
    total: circleIndex + 1,
  })

  const namePlaceholder = useMemo(
    () =>
      circleIndex === 0
        ? t('onboarding.familyNameDefault')
        : t('onboarding.familyNameDefaultNumbered', { n: circleIndex + 1 }),
    [circleIndex, t],
  )

  const applyNameSuggestion = () => {
    const suggestion = defaultFamilyCircleName(selfPatientName, circleIndex, circleNames)
    nameForm.setFieldsValue({ name: suggestion })
  }

  const onNameContinue = async (values: { name: string }) => {
    const name = values.name.trim()
    if (!name) return
    if (circleNames.some((n) => n.trim().toLowerCase() === name.toLowerCase())) {
      setError(t('onboarding.familyNameDuplicate'))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const created = await api.careCircles.create(name)
      trackProductEvent('onboarding_step', { step: 'family_circle_created', circle_index: circleIndex })
      if (circleIndex === 0) {
        await api.careCircles.linkPatient(created.id, selfPatientId)
      }
      setCircleNames((prev) => [...prev, name])
      setActiveCircleId(created.id)
      setActiveCircleName(name)
      setMembers([])
      setIncludeSelf(circleIndex === 0)
      setPhase('members')
      trackProductEvent('onboarding_step', { step: 'step_2_viewed', circle_index: circleIndex })
    } catch (e) {
      setError(e instanceof Error ? e.message : t('onboarding.error'))
    } finally {
      setSubmitting(false)
    }
  }

  const onCancelDraftFamily = async () => {
    if (circleIndex <= 0) return
    const newIndex = circleIndex - 1
    const prevName = circleNames[newIndex]
    try {
      const rows = await api.careCircles.list()
      const prev = rows.find((r) => r.name === prevName)
      setCircleIndex(newIndex)
      setPhase('members')
      setActiveCircleId(prev?.id ?? null)
    } catch {
      setCircleIndex(newIndex)
      setPhase('members')
    }
  }

  const onAddMember = async (values: {
    name: string
    birthDate: { toDate: () => Date }
    gender?: 'male' | 'female'
    cpf?: string
    minorGuardianConsent?: boolean
  }) => {
    if (!activeCircleId) return
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
      await api.careCircles.linkPatient(activeCircleId, created.id)
      setMembers((prev) => [...prev, { id: created.id, name: created.name }])
      memberForm.resetFields()
      trackProductEvent('onboarding_step', { step: 'family_member_added', circle_index: circleIndex })
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

  const onIncludeSelfChange = async (checked: boolean) => {
    if (!activeCircleId || circleIndex === 0) return
    setSubmitting(true)
    setError(null)
    try {
      if (checked) {
        await api.careCircles.linkPatient(activeCircleId, selfPatientId)
      } else {
        await api.careCircles.unlinkPatient(activeCircleId, selfPatientId)
      }
      setIncludeSelf(checked)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('onboarding.error'))
    } finally {
      setSubmitting(false)
    }
  }

  const skipMembers = () => {
    trackProductEvent('onboarding_step', { step: 'family_members_skipped', circle_index: circleIndex })
  }

  const startAnotherFamily = () => {
    trackProductEvent('onboarding_step', { step: 'another_family_started', circle_index: circleIndex })
    setActiveCircleId(null)
    setActiveCircleName('')
    setMembers([])
    setIncludeSelf(false)
    setCircleIndex((i) => i + 1)
    setPhase('name')
    nameForm.resetFields()
  }

  const goFinish = () => {
    trackProductEvent('onboarding_step', { step: 'onboarding_families_complete' })
    trackProductEvent('onboarding_step', {
      step: members.length > 0 ? 'dependents_complete' : 'dependents_skipped',
    })
    onFinish()
  }

  if (phase === 'name') {
    return (
      <div data-testid="onboarding-step-family-name">
        <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
          {familyProgressLabel}
        </Text>
        <Title level={3} style={{ marginBottom: 4 }}>{t('onboarding.familiesTitle')}</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>{t('onboarding.familyNameHint')}</Text>

        <OnboardingErrorAlert message={error} cpfAlreadyLinked={cpfAlreadyLinked} />

        <Form form={nameForm} layout="vertical" onFinish={onNameContinue} requiredMark={false}>
          <Form.Item
            name="name"
            label={t('onboarding.familyNameLabel')}
            rules={[
              { required: true, message: t('onboarding.familyNameRequired') },
              { max: 120, message: t('onboarding.familyNameTooLong') },
            ]}
          >
            <Input size="large" placeholder={namePlaceholder} maxLength={120} />
          </Form.Item>
          <Button type="link" onClick={applyNameSuggestion} style={{ padding: 0, marginBottom: 16 }}>
            {t('onboarding.familyNameUseSuggestion', {
              name: defaultFamilyCircleName(selfPatientName, circleIndex, circleNames),
            })}
          </Button>
          <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
            {t('onboarding.continue')}
          </Button>
          {circleIndex > 0 && !activeCircleId && (
            <Button type="link" block onClick={onCancelDraftFamily} style={{ marginTop: 8 }}>
              {t('onboarding.cancelDraftFamily')}
            </Button>
          )}
        </Form>
      </div>
    )
  }

  return (
    <div data-testid="onboarding-step-family-members">
      <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
        {familyProgressLabel}
      </Text>
      <Title level={3} style={{ marginBottom: 4 }}>
        {t('onboarding.familyMembersTitle', { name: activeCircleName })}
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
        {t('onboarding.familyMembersInCircle')}
      </Text>
      <Tag color="geekblue" style={{ marginBottom: 16 }}>{activeCircleName}</Tag>

      <OnboardingErrorAlert message={error} cpfAlreadyLinked={cpfAlreadyLinked} />

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message={
          circleIndex === 0
            ? t('onboarding.selfInFirstCircle', { name: selfPatientName })
            : t('onboarding.includeSelfInCircleLabel', { name: selfPatientName })
        }
        description={
          circleIndex === 0
            ? undefined
            : (
              <Checkbox
                checked={includeSelf}
                disabled={submitting}
                onChange={(e) => onIncludeSelfChange(e.target.checked)}
                data-testid="onboarding-include-self"
              >
                {t('onboarding.includeSelfInCircle')}
              </Checkbox>
            )
        }
      />

      {members.length > 0 && (
        <Alert
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
          message={t('onboarding.dependentsAdded', { count: members.length })}
          description={members.map((d) => d.name).join(', ')}
        />
      )}

      <Form form={memberForm} layout="vertical" onFinish={onAddMember} requiredMark={false}>
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
            onChange={(e) => memberForm.setFieldValue('cpf', formatCpfInput(e.target.value))}
          />
        </Form.Item>
        {showMinorConsent && <MinorGuardianConsentFormItem />}
        <Button type="default" htmlType="submit" block size="large" loading={submitting}>
          {t('onboarding.addDependent')}
        </Button>
      </Form>

      <Space direction="vertical" style={{ width: '100%', marginTop: 16 }}>
        <Button
          type="default"
          block
          size="large"
          data-testid="onboarding-add-another-family"
          onClick={startAnotherFamily}
          disabled={!activeCircleId}
        >
          {t('onboarding.addAnotherFamily')}
        </Button>
        <Button type="primary" block size="large" onClick={() => { skipMembers(); goFinish() }}>
          {t('onboarding.continue')}
        </Button>
        <Button type="link" block onClick={() => { skipMembers(); goFinish() }}>
          {t('onboarding.skipMembersForCircle')}
        </Button>
        <Text type="secondary" style={{ fontSize: 12, textAlign: 'center', display: 'block' }}>
          <Link to="/family">{t('onboarding.manageFamiliesLater')}</Link>
        </Text>
      </Space>
    </div>
  )
}
