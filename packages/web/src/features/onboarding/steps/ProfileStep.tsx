import { Button, Form, Input, Select, Typography, type FormInstance } from 'antd'
import { useTranslation } from 'react-i18next'
import { MaskedDatePicker } from '../../../components/ui/MaskedDatePicker.js'
import { formatCpfInput } from '../../../lib/input-masks.js'
import { isAdult, validateBirthDateField } from '../onboarding-validation.js'

const { Title, Text } = Typography

import type { OnboardingProfileFormValues } from '../profile-form.types.js'

type ProfileStepProps = {
  form: FormInstance<OnboardingProfileFormValues>
  submitting: boolean
  onContinue: () => void
}

export function ProfileStep({ form, submitting, onContinue }: ProfileStepProps) {
  const { t } = useTranslation()

  return (
    <>
      <Title level={3} style={{ marginBottom: 4 }}>{t('onboarding.welcomeTitle')}</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>{t('onboarding.welcomeSubtitle')}</Text>

      <Form form={form} layout="vertical" onFinish={onContinue} requiredMark={false} preserve>
        <Form.Item name="name" label={t('onboarding.name')} rules={[{ required: true, message: t('onboarding.nameRequired') }]}>
          <Input size="large" autoComplete="name" data-testid="onboarding-profile-name" />
        </Form.Item>
        <Form.Item
          name="socialName"
          label={t('onboarding.socialName')}
          extra={t('onboarding.socialNameHint')}
        >
          <Input size="large" autoComplete="nickname" data-testid="onboarding-social-name" />
        </Form.Item>
        <Form.Item
          name="birthDate"
          label={t('onboarding.birthDate')}
          rules={[
            { required: true, message: t('onboarding.birthDateRequired') },
            { validator: (_, value) => validateBirthDateField(value, t) },
            {
              validator: (_, value) => {
                if (!value) return Promise.resolve()
                const date = value.toDate?.() ?? value
                return isAdult(date) ? Promise.resolve() : Promise.reject(new Error(t('onboarding.adultOnly')))
              },
            },
          ]}
        >
          <MaskedDatePicker style={{ width: '100%' }} data-testid="onboarding-profile-birthdate" />
        </Form.Item>
        <Form.Item name="gender" label={t('onboarding.gender')} rules={[{ required: true, message: t('onboarding.genderRequired') }]}>
          <Select
            size="large"
            placeholder={t('onboarding.genderPlaceholder')}
            data-testid="onboarding-gender-select"
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
            data-testid="onboarding-profile-cpf"
            onChange={(e) => form.setFieldValue('cpf', formatCpfInput(e.target.value))}
          />
        </Form.Item>
        <Form.Item name="cns" label={t('onboarding.cnsLabel')} extra={t('onboarding.cnsHint')}>
          <Input placeholder={t('onboarding.cnsPlaceholder')} maxLength={15} />
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          block
          size="large"
          loading={submitting}
          data-testid="onboarding-identity-continue"
        >
          {t('onboarding.continue')}
        </Button>
      </Form>
    </>
  )
}
