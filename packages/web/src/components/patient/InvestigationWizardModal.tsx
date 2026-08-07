import { useState } from 'react'
import { Modal, Form, Input, Steps, Button, Select, Space } from 'antd'
import { api } from '../../lib/api.js'
import type { HealthThread } from '../../lib/api.types.js'

interface Props {
  open: boolean
  patientId: string
  onClose: () => void
  onCreated: (thread: HealthThread) => void
}

export function InvestigationWizardModal({ open, patientId, onClose, onCreated }: Props) {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()

  const reset = () => {
    setStep(0)
    form.resetFields()
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const submit = async () => {
    const values = await form.validateFields()
    setLoading(true)
    try {
      const planned = (values.plannedSteps as string | undefined)
        ?.split('\n')
        .map((s) => s.trim())
        .filter(Boolean) ?? []
      const symptoms = (values.symptoms as string | undefined)
        ?.split('\n')
        .map((s) => s.trim())
        .filter(Boolean) ?? []

      const thread = await api.healthThreads.wizardInvestigation({
        patientId,
        title: values.title,
        reason: values.reason,
        workingHypothesis: values.workingHypothesis,
        plannedSteps: planned,
        symptoms,
      })
      onCreated(thread)
      handleClose()
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    {
      title: 'Título',
      content: (
        <Form.Item
          name="title"
          label="O que está sendo investigado?"
          rules={[{ required: true, message: 'Informe um título' }]}
        >
          <Input placeholder="Ex.: Avaliação adenoides e trato respiratório" maxLength={500} />
        </Form.Item>
      ),
    },
    {
      title: 'Contexto',
      content: (
        <>
          <Form.Item name="reason" label="Motivo / queixa">
            <Input.TextArea rows={3} placeholder="Obstrução nasal, respiração bucal…" />
          </Form.Item>
          <Form.Item name="symptoms" label="Sintomas (um por linha)">
            <Input.TextArea rows={2} placeholder="Ronco&#10;Tosse noturna" />
          </Form.Item>
        </>
      ),
    },
    {
      title: 'Hipótese',
      content: (
        <Form.Item name="workingHypothesis" label="Hipótese de trabalho (opcional)">
          <Input placeholder="Ex.: Hipertrofia de adenoides?" />
        </Form.Item>
      ),
    },
    {
      title: 'Plano',
      content: (
        <Form.Item name="plannedSteps" label="Próximos passos planejados (um por linha)">
          <Input.TextArea rows={4} placeholder="RX adenoides&#10;Consulta otorrino&#10;Polissonografia" />
        </Form.Item>
      ),
    },
  ]

  return (
    <Modal
      open={open}
      title="Nova investigação"
      onCancel={handleClose}
      width={560}
      footer={
        <Space>
          <Button onClick={handleClose}>Cancelar</Button>
          {step > 0 && <Button onClick={() => setStep((s) => s - 1)}>Voltar</Button>}
          {step < steps.length - 1 ? (
            <Button type="primary" onClick={() => setStep((s) => s + 1)}>Continuar</Button>
          ) : (
            <Button type="primary" loading={loading} onClick={() => submit()}>Abrir investigação</Button>
          )}
        </Space>
      }
      destroyOnClose
    >
      <Steps current={step} size="small" items={steps.map((s) => ({ title: s.title }))} style={{ marginBottom: 24 }} />
      <Form form={form} layout="vertical" preserve={false}>
        {steps[step].content}
      </Form>
    </Modal>
  )
}
