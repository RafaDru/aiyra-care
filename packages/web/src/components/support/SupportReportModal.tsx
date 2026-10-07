import { useEffect, useState } from 'react'
import { Modal, Form, Select, Input, Checkbox, Alert, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { awaitPendingClientErrorReports } from '../../lib/client-errors.js'
import {
  buildSupportClientContext,
  getBrowserSessionId,
  inferPatientIdFromRoute,
} from '../../lib/support-report.js'
import type { SupportReportCategory } from '../../lib/api.types.js'
import { SupportResolutionPrompt } from './SupportResolutionPrompt.js'

const { Text, Link } = Typography

type SupportReportFormValues = {
  category: SupportReportCategory
  description?: string
  consentTechnical: boolean
  consentProfileAccess: boolean
}

interface SupportReportModalProps {
  open: boolean
  onClose: () => void
}

export function SupportReportModal({ open, onClose }: SupportReportModalProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(false)
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null)
  const [form] = Form.useForm<SupportReportFormValues>()

  useEffect(() => {
    if (!open) {
      setSubmittedReportId(null)
      setSubmitError(false)
    }
  }, [open])

  const finishAndClose = () => {
    form.resetFields()
    setSubmittedReportId(null)
    onClose()
  }

  const handleFinish = async (values: SupportReportFormValues) => {
    setSubmitting(true)
    setSubmitError(false)
    try {
      if (values.consentTechnical) {
        await awaitPendingClientErrorReports()
      }
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
      setSubmittedReportId(result.id)
    } catch {
      setSubmitError(true)
    } finally {
      setSubmitting(false)
    }
  }

  const thankYou = submittedReportId !== null

  return (
    <Modal
      title={thankYou ? t('support.reportThankYouTitle') : t('support.reportTitle')}
      open={open}
      onCancel={finishAndClose}
      onOk={thankYou ? undefined : () => form.submit()}
      okText={t('support.reportSubmit')}
      cancelText={thankYou ? t('common.close') : t('common.cancel')}
      confirmLoading={submitting}
      destroyOnClose
      width={520}
      footer={thankYou ? null : undefined}
    >
      {thankYou ? (
        <>
          <Alert
            type="success"
            showIcon
            message={t('support.reportSuccess', { id: submittedReportId.slice(0, 8) })}
            description={t('support.reportThankYouBody')}
          />
          <SupportResolutionPrompt
            reportId={submittedReportId}
            source="support_report_thank_you"
            onDone={finishAndClose}
          />
        </>
      ) : (
        <>
          {submitError ? (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
              message={t('support.reportError')}
            />
          ) : null}
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
            onFinish={(values) => void handleFinish(values)}
          >
            <Form.Item
              name="category"
              label={t('support.categoryLabel')}
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { value: 'account_login_cpf', label: t('support.categoryAccountLoginCpf') },
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
        </>
      )}
    </Modal>
  )
}
