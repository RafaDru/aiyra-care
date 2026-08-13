import { useEffect } from 'react'
import { Modal, Form, Input, App, Select } from 'antd'
import { MaskedDatePicker } from '../ui/MaskedDatePicker.js'
import dayjs from 'dayjs'
import { api } from '../../lib/api.js'
import { isMinorBirthDate } from '../../lib/patient-age.js'
import { MinorGuardianConsentFormItem } from '../legal/MinorGuardianConsentField.js'

export interface UnmatchedBeneficiary {
  name: string
  marcaOtica: string
  cpf?: string
  cns?: string
  birthDate?: string
  role: 'holder' | 'dependent'
  authorizationCount: number
}

interface Props {
  open: boolean
  beneficiary: UnmatchedBeneficiary | null
  holderPatientId: string
  onClose: () => void
  onRegistered: () => void
}

function titleCase(name: string): string {
  return name
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function RegisterAmilDependentModal({
  open,
  beneficiary,
  holderPatientId,
  onClose,
  onRegistered,
}: Props) {
  const { message } = App.useApp()
  const [form] = Form.useForm()

  useEffect(() => {
    if (!open || !beneficiary) return
    const isMinor = isMinorBirthDate(beneficiary.birthDate)
    form.setFieldsValue({
      name: titleCase(beneficiary.name),
      birthDate: beneficiary.birthDate ? dayjs(beneficiary.birthDate) : undefined,
      cpf: beneficiary.cpf,
      cns: beneficiary.cns,
      parentIds: isMinor ? [holderPatientId] : [],
    })
  }, [open, beneficiary, holderPatientId, form])

  const birthDateWatch = Form.useWatch('birthDate', form)
  const showMinorConsent = birthDateWatch
    ? isMinorBirthDate(birthDateWatch.toDate?.() ?? birthDateWatch)
    : isMinorBirthDate(beneficiary?.birthDate)

  const handleOk = async () => {
    if (!beneficiary) return
    try {
      const values = await form.validateFields()
      const birthIso = values.birthDate.toISOString()
      if (isMinorBirthDate(birthIso) && values.guardianConsent) {
        await api.compliance.accept({ kinds: ['minor_guardian_consent'] })
      }
      await api.patients.create({
        name: values.name,
        birthDate: birthIso,
        cpf: values.cpf?.replace(/\D/g, '') || undefined,
        cns: values.cns?.replace(/\D/g, '') || undefined,
        parentIds: values.parentIds || [],
      })
      message.success('Paciente cadastrado. Sincronize novamente para importar guias e carteirinha.')
      onRegistered()
      onClose()
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      message.error(err instanceof Error ? err.message : 'Erro ao cadastrar')
    }
  }

  return (
    <Modal
      title="Cadastrar dependente do plano"
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText="Cadastrar"
      cancelText="Cancelar"
      width={520}
      destroyOnClose
    >
      {beneficiary && (
        <p style={{ marginBottom: 16, color: '#666' }}>
          Encontrado no plano Amil com {beneficiary.authorizationCount} guia(s) no portal.
          Carteirinha: {beneficiary.marcaOtica}
        </p>
      )}
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="birthDate" label="Data de nascimento" rules={[{ required: true }]}>
          <MaskedDatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="cpf" label="CPF">
          <Input placeholder="000.000.000-00" maxLength={14} />
        </Form.Item>
        <Form.Item name="cns" label="CNS">
          <Input maxLength={15} />
        </Form.Item>
        <Form.Item name="parentIds" label="Pais / responsáveis">
          <Select mode="multiple" disabled options={[{ value: holderPatientId, label: 'Titular do plano' }]} />
        </Form.Item>
        {showMinorConsent && <MinorGuardianConsentFormItem />}
      </Form>
    </Modal>
  )
}
