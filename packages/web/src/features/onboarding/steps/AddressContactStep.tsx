import { useState } from 'react'
import { Button, Checkbox, Form, Input, Select, Typography, type FormInstance } from 'antd'
import { useTranslation } from 'react-i18next'
import { formatCepInput, formatPhoneBrInput } from '../../../lib/input-masks.js'
import { fetchAddressByCep } from '../../../lib/viacep.js'
import type { OnboardingProfileFormValues } from '../profile-form.types.js'

const { Title, Text } = Typography

const UF_OPTIONS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
].map((uf) => ({ value: uf, label: uf }))

type AddressContactStepProps = {
  form: FormInstance<OnboardingProfileFormValues>
  submitting: boolean
  accountEmail?: string | null
  onFinish: (values: OnboardingProfileFormValues) => void
}

export function AddressContactStep({ form, submitting, accountEmail, onFinish }: AddressContactStepProps) {
  const { t } = useTranslation()
  const [cepLoading, setCepLoading] = useState(false)

  const lookupCep = async () => {
    const cep = form.getFieldValue('postalCode')?.replace(/\D/g, '') ?? ''
    if (cep.length !== 8) return
    setCepLoading(true)
    try {
      const addr = await fetchAddressByCep(cep)
      if (!addr) {
        form.setFields([{ name: 'postalCode', errors: [t('onboarding.address.cepNotFound')] }])
        return
      }
      form.setFieldsValue({
        street: addr.street,
        district: addr.district,
        city: addr.city,
        state: addr.state,
      })
    } finally {
      setCepLoading(false)
    }
  }

  return (
    <>
      <Title level={3} style={{ marginBottom: 4 }}>{t('onboarding.address.title')}</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>{t('onboarding.address.subtitle')}</Text>

      <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false} preserve>
        <Form.Item
          name="postalCode"
          label={t('onboarding.address.cep')}
          rules={[
            { required: true, message: t('onboarding.address.cepRequired') },
            { validator: (_, v) => !v || v.replace(/\D/g, '').length === 8 ? Promise.resolve() : Promise.reject(t('onboarding.address.cepInvalid')) },
          ]}
        >
          <Input.Search
            size="large"
            placeholder="00000-000"
            maxLength={9}
            loading={cepLoading}
            enterButton={t('onboarding.address.cepLookup')}
            data-testid="onboarding-address-cep"
            onChange={(e) => form.setFieldValue('postalCode', formatCepInput(e.target.value))}
            onSearch={() => void lookupCep()}
          />
        </Form.Item>
        <Form.Item name="street" label={t('onboarding.address.street')} rules={[{ required: true, message: t('onboarding.address.streetRequired') }]}>
          <Input size="large" data-testid="onboarding-address-street" />
        </Form.Item>
        <Form.Item name="streetNumber" label={t('onboarding.address.number')} rules={[{ required: true, message: t('onboarding.address.numberRequired') }]}>
          <Input size="large" data-testid="onboarding-address-number" />
        </Form.Item>
        <Form.Item name="addressComplement" label={t('onboarding.address.complement')}>
          <Input size="large" />
        </Form.Item>
        <Form.Item name="district" label={t('onboarding.address.district')} rules={[{ required: true, message: t('onboarding.address.districtRequired') }]}>
          <Input size="large" data-testid="onboarding-address-district" />
        </Form.Item>
        <Form.Item name="city" label={t('onboarding.address.city')} rules={[{ required: true, message: t('onboarding.address.cityRequired') }]}>
          <Input size="large" data-testid="onboarding-address-city" />
        </Form.Item>
        <Form.Item name="state" label={t('onboarding.address.state')} rules={[{ required: true, message: t('onboarding.address.stateRequired') }]}>
          <Select
            size="large"
            options={UF_OPTIONS}
            showSearch
            optionFilterProp="label"
            data-testid="onboarding-address-state"
          />
        </Form.Item>

        <Title level={5} style={{ marginTop: 8 }}>{t('onboarding.contact.title')}</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>{t('onboarding.contact.subtitle')}</Text>

        {accountEmail && (
          <Form.Item label={t('onboarding.contact.email')}>
            <Input size="large" value={accountEmail} disabled />
          </Form.Item>
        )}
        <Form.Item
          name="mobilePhone"
          label={t('onboarding.contact.mobile')}
          rules={[
            { required: true, message: t('onboarding.contact.mobileRequired') },
            { validator: (_, v) => !v || v.replace(/\D/g, '').length >= 10 ? Promise.resolve() : Promise.reject(t('onboarding.contact.mobileInvalid')) },
          ]}
        >
          <Input
            size="large"
            data-testid="onboarding-contact-mobile"
            onChange={(e) => form.setFieldValue('mobilePhone', formatPhoneBrInput(e.target.value))}
          />
        </Form.Item>
        <Form.Item
          name="phoneSecondary"
          label={t('onboarding.contact.phoneSecondary')}
          rules={[{ validator: (_, v) => !v || v.replace(/\D/g, '').length >= 10 ? Promise.resolve() : Promise.reject(t('onboarding.contact.mobileInvalid')) }]}
        >
          <Input size="large" onChange={(e) => form.setFieldValue('phoneSecondary', formatPhoneBrInput(e.target.value))} />
        </Form.Item>
        <Form.Item name="phoneIsWhatsapp" valuePropName="checked">
          <Checkbox>{t('onboarding.contact.phoneIsWhatsapp')}</Checkbox>
        </Form.Item>

        <Button type="primary" htmlType="submit" block size="large" loading={submitting} data-testid="onboarding-profile-submit">
          {t('onboarding.continue')}
        </Button>
      </Form>
    </>
  )
}
