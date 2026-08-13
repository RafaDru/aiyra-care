import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Checkbox, Form, Typography } from 'antd'
import { useTranslation } from 'react-i18next'

const { Text } = Typography

type Props = {
  value?: boolean
  onChange?: (checked: boolean) => void
}

export function MinorGuardianConsentField({ value, onChange }: Props) {
  const { t } = useTranslation()
  return (
    <Form.Item
      required
      validateStatus={value ? 'success' : undefined}
      style={{ marginBottom: 0 }}
    >
      <Checkbox checked={value} onChange={(e) => onChange?.(e.target.checked)}>
        <Text>{t('legal.minorConsentCheckbox')}</Text>
        {' '}
        <Link to="/consentimento-menor" target="_blank" rel="noopener noreferrer">
          {t('legal.minorConsentLink')}
        </Link>
      </Checkbox>
    </Form.Item>
  )
}

export function MinorGuardianConsentFormItem() {
  const { t } = useTranslation()
  return (
    <Form.Item
      name="guardianConsent"
      valuePropName="checked"
      rules={[
        {
          validator: (_, v) => v
            ? Promise.resolve()
            : Promise.reject(new Error(t('legal.minorConsentRequired'))),
        },
      ]}
    >
      <MinorGuardianConsentField />
    </Form.Item>
  )
}
