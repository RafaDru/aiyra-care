import { useState } from 'react'
import { Modal, Form, Input, Button } from 'antd'
import { MaskedDatePicker } from '../ui/MaskedDatePicker.js'
import { api } from '../../lib/api.js'
import type { HealthThread } from '../../lib/api.types.js'
import type { Dayjs } from 'dayjs'

interface Props {
  open: boolean
  patientId: string
  onClose: () => void
  onCreated: (thread: HealthThread) => void
}

export function TaskWizardModal({ open, patientId, onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()

  const handleClose = () => {
    form.resetFields()
    onClose()
  }

  const submit = async () => {
    const values = await form.validateFields()
    setLoading(true)
    try {
      const thread = await api.healthThreads.wizardTask({
        patientId,
        title: values.title,
        summary: values.summary,
        assignee: values.assignee,
        location: values.location,
        dueDate: (values.dueDate as Dayjs | undefined)?.toISOString(),
      })
      onCreated(thread)
      handleClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Novo plano de acompanhamento"
      onCancel={handleClose}
      onOk={() => submit()}
      okText="Registrar plano"
      confirmLoading={loading}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item name="title" label="O que precisa ser feito?" rules={[{ required: true }]}>
          <Input placeholder="Ex.: Checkup inicial com médica da família" maxLength={500} />
        </Form.Item>
        <Form.Item name="summary" label="Detalhes (opcional)">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="assignee" label="Com quem / responsável">
          <Input placeholder="Médica da família, clínica…" />
        </Form.Item>
        <Form.Item name="location" label="Local">
          <Input placeholder="Clínica, hospital…" />
        </Form.Item>
        <Form.Item name="dueDate" label="Data objetivo">
          <MaskedDatePicker style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
