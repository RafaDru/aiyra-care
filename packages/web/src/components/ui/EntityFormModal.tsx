import { useState } from 'react'
import { Modal, Form, App } from 'antd'
import { useTranslation } from 'react-i18next'

interface EntityFormModalProps {
  open: boolean
  title: string
  successMsg: string
  onClose: () => void
  onSubmit: (values: Record<string, unknown>) => Promise<void>
  children: React.ReactNode
  initialValues?: Record<string, unknown>
}

export function EntityFormModal({ open, title, successMsg, onClose, onSubmit, children, initialValues }: EntityFormModalProps) {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      await onSubmit(values)
      message.success(successMsg)
      form.resetFields()
      onClose()
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      message.error(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    onClose()
  }

  return (
    <Modal
      title={title}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={submitting}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      destroyOnClose
      forceRender
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }} initialValues={initialValues}>
        {children}
      </Form>
    </Modal>
  )
}
