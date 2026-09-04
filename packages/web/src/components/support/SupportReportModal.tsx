import { useState } from 'react'
import { Modal, Form, Select, Input, Checkbox, Alert, Typography, message } from 'antd'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { api } from '../../lib/api.js'
import {
  buildSupportClientContext,
  getBrowserSessionId,
  inferPatientIdFromRoute,
} from '../../lib/support-report.js'
import type { SupportReportCategory } from '../../lib/api.types.js'

const { Text, Link } = Typography

interface SupportReportModalProps {
  open: boolean
  onClose: () => void
}

export function SupportReportModal({ open, onClose }: SupportReportModalProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm<{
    category: SupportReportCategory
    description?: string
    consentTechnical: boolean
    consentProfileAccess: boolean
  }>()

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      const patientId = inferPatientIdFromRoute(location.pathname)
      const result = await api.support.createReport({
        category: values.category,
        description: values.description,
        route: location.pathname,
        sessionId: getBrowserSessionId(),
        patientId,
        consentTechnical: values.consentTechnical,
        consentScreenshot: false,
        consentProfileAccess: values.consentProfileAccess,
        appVersion: import.meta.env.MODE,
        userAgent: navigator.userAgent.slice(0, 256),
        clientContext: buildSupportClientContext(),
      })
      message.success(t('support.reportSuccess', { id: result.id.slice(0, 8) }))
      form.resetFields()
      onClose()
    } catch {
      message.error(t('support.reportError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={t('support.reportTitle')}
      open={open}
      onCancel={onClose}
      onOk={() => void handleSubmit()}
      okText={t('support.reportSubmit')}
      cancelText={t('common.cancel')}
      confirmLoading={submitting}
      destroyOnClose
      width={520}
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message={t('support.reportPrivacyHint')}
      />
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          category: 'technical_bug',
          consentTechnical: true,
          consentProfileAccess: false,
        }}
      >
        <Form.Item
          name="category"
          label={t('support.categoryLabel')}
          rules={[{ required: true }]}
        >
          <Select
            options={[
              { value: 'technical_bug', label: t('support.categoryTechnical') },
              { value: 'incorrect_data', label: t('support.categoryIncorrectData') },
              { value: 'ux_confusion', label: t('support.categoryUx') },
              { value: 'other', label: t('support.categoryOther') },
            ]}
          />
        </Form.Item>
        <Form.Item name="description" label={t('support.descriptionLabel')}>
          <Input.TextArea
            rows={4}
            maxLength={2000}
            showCount
            placeholder={t('support.descriptionPlaceholder')}
          />
        </Form.Item>
        <Form.Item name="consentTechnical" valuePropName="checked">
          <Checkbox>{t('support.consentTechnical')}</Checkbox>
        </Form.Item>
        <Form.Item name="consentProfileAccess" valuePropName="checked">
          <Checkbox>{t('support.consentProfileAccess')}</Checkbox>
        </Form.Item>
      </Form>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {t('support.privacyFooter')}{' '}
        <Link href="/privacidade" target="_blank" rel="noopener noreferrer">
          {t('legal.privacyLink')}
        </Link>
      </Text>
    </Modal>
  )
}
