import { useEffect, useState } from 'react'
import { Button, Form, Input, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { api } from '../../../lib/api.js'
import { trackProductEvent } from '../../../lib/product-events.js'

const { Title, Text } = Typography

type AvaSummaryStepProps = {
  submitting: boolean
  setSubmitting: (v: boolean) => void
  onFinish: () => void
}

export function AvaSummaryStep({ submitting, setSubmitting, onFinish }: AvaSummaryStepProps) {
  const { t } = useTranslation()
  const [form] = Form.useForm<{ bio: string }>()

  useEffect(() => {
    trackProductEvent('onboarding_step', { step: 'ava_summary_viewed' })
    api.auth
      .getProfile()
      .then((view) => {
        if (view.profile.bio?.trim()) {
          form.setFieldsValue({ bio: view.profile.bio })
        }
      })
      .catch(() => undefined)
  }, [form])

  const submit = async (values: { bio?: string }) => {
    const bio = values.bio?.trim()
    setSubmitting(true)
    try {
      if (bio) {
        await api.auth.updateProfile({ bio })
        trackProductEvent('onboarding_step', { step: 'ava_summary_saved' })
      } else {
        trackProductEvent('onboarding_step', { step: 'ava_summary_skipped' })
      }
      onFinish()
    } catch (e) {
      trackProductEvent('onboarding_step', { step: 'ava_summary_skipped', error: true })
      onFinish()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div data-testid="onboarding-step-ava-summary">
      <Title level={3} style={{ marginBottom: 4 }}>{t('onboarding.avaSummaryTitle')}</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        {t('onboarding.avaSummarySubtitle')}
      </Text>

      <Form form={form} layout="vertical" onFinish={(v) => void submit(v)} requiredMark={false}>
        <Form.Item
          name="bio"
          label={t('onboarding.avaSummaryLabel')}
          extra={t('onboarding.avaSummaryHint')}
          rules={[{ max: 500, message: t('onboarding.avaSummaryTooLong') }]}
        >
          <Input.TextArea rows={4} maxLength={500} data-testid="onboarding-ava-summary-input" />
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          block
          size="large"
          loading={submitting}
          data-testid="onboarding-ava-summary-continue"
        >
          {t('onboarding.finish')}
        </Button>
        <Button
          type="link"
          block
          style={{ marginTop: 8 }}
          disabled={submitting}
          onClick={() => void submit({})}
          data-testid="onboarding-ava-summary-skip"
        >
          {t('onboarding.avaSummarySkip')}
        </Button>
      </Form>
    </div>
  )
}
