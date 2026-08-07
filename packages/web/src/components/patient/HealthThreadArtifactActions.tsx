import { useState } from 'react'
import { Button, Dropdown, Form, Input, InputNumber, Modal, Select, Space, Typography, message } from 'antd'
import { LinkOutlined, PlusOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import { api } from '../../lib/api.js'
import { MaskedDatePicker } from '../ui/MaskedDatePicker.js'
import { CarePlaceAutocomplete } from '../ui/CarePlaceAutocomplete.js'
import {
  defaultLinkRole,
  linkRoleHint,
  linkRoleSelectOptions,
  type HealthThreadLinkRole,
} from './health-thread-link-roles.js'
import { LinkRoleHelpButton, LinkRoleHelpModal } from './LinkRoleHelpModal.js'

const { Text } = Typography

type LinkEntityType =
  | 'exam'
  | 'medical_record'
  | 'authorization'
  | 'medication'
  | 'vaccine'
  | 'document'

const ENTITY_LABEL: Record<LinkEntityType, string> = {
  exam: 'Exame',
  medical_record: 'Consulta',
  authorization: 'Autorização',
  medication: 'Medicamento',
  vaccine: 'Vacina',
  document: 'Documento',
}

const ADDABLE: LinkEntityType[] = [
  'exam',
  'medical_record',
  'authorization',
  'medication',
  'vaccine',
]

const LINKABLE: LinkEntityType[] = [
  'exam',
  'medical_record',
  'authorization',
  'medication',
  'vaccine',
  'document',
]

interface Props {
  threadId: string | null
  patientId: string
  onUpdated?: () => void
  onReload: () => void
}

export function HealthThreadArtifactActions({ threadId, patientId, onUpdated, onReload }: Props) {
  const [addOpen, setAddOpen] = useState<LinkEntityType | null>(null)
  const [linkOpen, setLinkOpen] = useState(false)
  const [roleHelpOpen, setRoleHelpOpen] = useState(false)
  const [roleHelpEntity, setRoleHelpEntity] = useState<string | undefined>()
  const [linkEntityType, setLinkEntityType] = useState<LinkEntityType>('exam')
  const [linkOptions, setLinkOptions] = useState<Array<{ value: string; label: string }>>([])

  const [examForm] = Form.useForm()
  const [recordForm] = Form.useForm()
  const [authForm] = Form.useForm()
  const [medForm] = Form.useForm()
  const [vaccineForm] = Form.useForm()
  const [linkForm] = Form.useForm()

  const reload = () => {
    onReload()
    onUpdated?.()
  }

  const openLink = async (entityType: LinkEntityType) => {
    setLinkEntityType(entityType)
    let options: Array<{ value: string; label: string }> = []

    if (entityType === 'exam') {
      const list = await api.exams.list(patientId)
      options = list.map((e) => ({
        value: e.id,
        label: `${e.examType} — ${new Date(e.examDate).toLocaleDateString('pt-BR')}`,
      }))
    } else if (entityType === 'medical_record') {
      const list = await api.medicalRecords.list(patientId)
      options = list.map((r) => ({
        value: r.id,
        label: `${r.description ?? r.recordType} — ${new Date(r.recordDate).toLocaleDateString('pt-BR')}`,
      }))
    } else if (entityType === 'authorization') {
      const list = await api.authorizations.list(patientId)
      options = list.map((a) => ({
        value: a.id,
        label: a.authorizationDate
          ? `${a.procedureDescription ?? a.guideNumber ?? 'Autorização'} — ${new Date(a.authorizationDate).toLocaleDateString('pt-BR')}`
          : (a.procedureDescription ?? a.guideNumber ?? 'Autorização'),
      }))
    } else if (entityType === 'medication') {
      const list = await api.medications.list(patientId)
      options = list.map((m) => ({
        value: m.id,
        label: m.brandName ? `${m.genericName} (${m.brandName})` : m.genericName,
      }))
    } else if (entityType === 'vaccine') {
      const list = await api.vaccines.list(patientId)
      options = list.map((v) => ({
        value: v.id,
        label: `${v.vaccineName} — ${new Date(v.applicationDate).toLocaleDateString('pt-BR')}`,
      }))
    } else {
      const list = await api.documents.list(patientId)
      options = list.map((d) => ({
        value: d.id,
        label: `${d.originalFilename} (${d.documentType})`,
      }))
    }

    setLinkOptions(options)
    linkForm.resetFields()
    linkForm.setFieldsValue({ role: defaultLinkRole(entityType) })
    setLinkOpen(true)
  }

  const linkArtifact = async () => {
    if (!threadId) return
    const values = await linkForm.validateFields()
    try {
      await api.healthThreads.linkArtifact(threadId, {
        entityType: linkEntityType,
        entityId: values.entityId,
        role: values.role ?? 'related',
      })
      setLinkOpen(false)
      linkForm.resetFields()
      reload()
      message.success(`${ENTITY_LABEL[linkEntityType]} vinculado`)
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Erro')
    }
  }

  const createExam = async () => {
    if (!threadId) return
    const values = await examForm.validateFields()
    try {
      await api.healthThreads.createExam(threadId, {
        examType: values.examType,
        examDate: (values.examDate as Dayjs).toISOString(),
        laboratory: values.laboratory,
        resultSummary: values.resultSummary,
        role: values.role ?? 'ordered',
      })
      setAddOpen(null)
      examForm.resetFields()
      reload()
      message.success('Exame registrado e vinculado')
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Erro')
    }
  }

  const createRecord = async () => {
    if (!threadId) return
    const values = await recordForm.validateFields()
    try {
      await api.healthThreads.createMedicalRecord(threadId, {
        recordDate: (values.recordDate as Dayjs).toISOString(),
        recordType: values.recordType ?? 'consulta',
        description: values.description,
        doctorName: values.doctorName,
        specialty: values.specialty,
        clinicName: values.clinicName,
        role: values.role ?? 'related',
      })
      setAddOpen(null)
      recordForm.resetFields()
      reload()
      message.success('Consulta registrada e vinculada')
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Erro')
    }
  }

  const createAuth = async () => {
    if (!threadId) return
    const values = await authForm.validateFields()
    try {
      await api.healthThreads.createAuthorization(threadId, {
        procedureDescription: values.procedureDescription,
        authorizationDate: (values.authorizationDate as Dayjs | undefined)?.toISOString(),
        guideNumber: values.guideNumber,
        doctorName: values.doctorName,
        clinicName: values.clinicName,
        role: values.role ?? 'ordered',
      })
      setAddOpen(null)
      authForm.resetFields()
      reload()
      message.success('Autorização registrada e vinculada')
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Erro')
    }
  }

  const createMedication = async () => {
    if (!threadId) return
    const values = await medForm.validateFields()
    try {
      await api.healthThreads.createMedication(threadId, {
        genericName: values.genericName,
        brandName: values.brandName,
        dosage: values.dosage,
        frequency: values.frequency,
        startDate: (values.startDate as Dayjs | undefined)?.toISOString(),
        prescribingDoctor: values.prescribingDoctor,
        notes: values.notes,
        role: values.role ?? 'ordered',
      })
      setAddOpen(null)
      medForm.resetFields()
      reload()
      message.success('Medicamento registrado e vinculado')
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Erro')
    }
  }

  const createVaccine = async () => {
    if (!threadId) return
    const values = await vaccineForm.validateFields()
    try {
      await api.healthThreads.createVaccine(threadId, {
        vaccineName: values.vaccineName,
        applicationDate: (values.applicationDate as Dayjs).toISOString(),
        doseNumber: values.doseNumber,
        batchNumber: values.batchNumber,
        clinic: values.clinic,
        appliedBy: values.appliedBy,
        notes: values.notes,
        role: values.role ?? 'related',
      })
      setAddOpen(null)
      vaccineForm.resetFields()
      reload()
      message.success('Vacina registrada e vinculada')
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Erro')
    }
  }

  const roleField = (entityType: string, optional = false) => (
    <>
      <Form.Item
        name="role"
        label={
          <Space size={6}>
            Como se relaciona com esta trilha?
            <LinkRoleHelpButton
              onClick={() => {
                setRoleHelpEntity(entityType)
                setRoleHelpOpen(true)
              }}
            />
          </Space>
        }
        rules={optional ? [] : [{ required: true }]}
      >
        <Select options={linkRoleSelectOptions(entityType)} />
      </Form.Item>
      <Form.Item noStyle shouldUpdate={(prev, cur) => prev.role !== cur.role}>
        {({ getFieldValue }) => {
          const role = getFieldValue('role') as HealthThreadLinkRole | undefined
          if (!role) return null
          return (
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 16 }}>
              {linkRoleHint(role)}
            </Text>
          )
        }}
      </Form.Item>
    </>
  )

  return (
    <>
      <Space wrap style={{ marginBottom: 16 }}>
        <Dropdown
          menu={{
            items: ADDABLE.map((key) => ({
              key,
              label: `Adicionar ${ENTITY_LABEL[key].toLowerCase()}`,
              onClick: () => setAddOpen(key),
            })),
          }}
        >
          <Button size="small" icon={<PlusOutlined />}>
            Adicionar…
          </Button>
        </Dropdown>
        <Dropdown
          menu={{
            items: LINKABLE.map((key) => ({
              key,
              label: `Vincular ${ENTITY_LABEL[key].toLowerCase()} existente`,
              onClick: () => openLink(key),
            })),
          }}
        >
          <Button size="small" icon={<LinkOutlined />}>
            Vincular…
          </Button>
        </Dropdown>
      </Space>

      <Modal
        open={addOpen === 'exam'}
        title="Adicionar exame"
        onCancel={() => setAddOpen(null)}
        onOk={() => createExam()}
        okText="Salvar"
        destroyOnClose
      >
        <Form form={examForm} layout="vertical" initialValues={{ role: 'ordered' }}>
          <Form.Item name="examType" label="Tipo" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="examDate" label="Data" rules={[{ required: true }]}>
            <MaskedDatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="laboratory" label="Laboratório / local">
            <CarePlaceAutocomplete />
          </Form.Item>
          <Form.Item name="resultSummary" label="Resultado (se já tiver)">
            <Input.TextArea rows={2} />
          </Form.Item>
          {roleField('exam')}
        </Form>
      </Modal>

      <Modal
        open={addOpen === 'medical_record'}
        title="Adicionar consulta"
        onCancel={() => setAddOpen(null)}
        onOk={() => createRecord()}
        okText="Salvar"
        destroyOnClose
      >
        <Form form={recordForm} layout="vertical" initialValues={{ recordType: 'consulta', role: 'related' }}>
          <Form.Item name="recordDate" label="Data" rules={[{ required: true }]}>
            <MaskedDatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="recordType" label="Tipo">
            <Select
              options={[
                { value: 'consulta', label: 'Consulta' },
                { value: 'retorno', label: 'Retorno' },
                { value: 'urgencia', label: 'Urgência' },
                { value: 'outro', label: 'Outro' },
              ]}
            />
          </Form.Item>
          <Form.Item name="description" label="Descrição" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="doctorName" label="Profissional">
            <Input />
          </Form.Item>
          <Form.Item name="specialty" label="Especialidade">
            <Input />
          </Form.Item>
          <Form.Item name="clinicName" label="Local">
            <CarePlaceAutocomplete />
          </Form.Item>
          {roleField('medical_record')}
        </Form>
      </Modal>

      <Modal
        open={addOpen === 'authorization'}
        title="Adicionar autorização / pedido"
        onCancel={() => setAddOpen(null)}
        onOk={() => createAuth()}
        okText="Salvar"
        destroyOnClose
      >
        <Form form={authForm} layout="vertical" initialValues={{ role: 'ordered' }}>
          <Form.Item name="procedureDescription" label="Procedimento" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="authorizationDate" label="Data">
            <MaskedDatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="guideNumber" label="Nº guia / pedido">
            <Input />
          </Form.Item>
          <Form.Item name="doctorName" label="Médico">
            <Input />
          </Form.Item>
          <Form.Item name="clinicName" label="Local">
            <Input />
          </Form.Item>
          {roleField('authorization')}
        </Form>
      </Modal>

      <Modal
        open={addOpen === 'medication'}
        title="Adicionar medicamento / receita"
        onCancel={() => setAddOpen(null)}
        onOk={() => createMedication()}
        okText="Salvar"
        destroyOnClose
      >
        <Form form={medForm} layout="vertical" initialValues={{ role: 'ordered' }}>
          <Form.Item name="genericName" label="Medicamento" rules={[{ required: true }]}>
            <Input placeholder="Nome genérico" />
          </Form.Item>
          <Form.Item name="brandName" label="Marca">
            <Input />
          </Form.Item>
          <Form.Item name="dosage" label="Dosagem">
            <Input placeholder="Ex.: 500mg" />
          </Form.Item>
          <Form.Item name="frequency" label="Frequência">
            <Input placeholder="Ex.: 8/8h" />
          </Form.Item>
          <Form.Item name="startDate" label="Início">
            <MaskedDatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="prescribingDoctor" label="Prescritor">
            <Input />
          </Form.Item>
          <Form.Item name="notes" label="Observações">
            <Input.TextArea rows={2} />
          </Form.Item>
          {roleField('medication')}
        </Form>
      </Modal>

      <Modal
        open={addOpen === 'vaccine'}
        title="Adicionar vacina"
        onCancel={() => setAddOpen(null)}
        onOk={() => createVaccine()}
        okText="Salvar"
        destroyOnClose
      >
        <Form form={vaccineForm} layout="vertical" initialValues={{ role: 'related' }}>
          <Form.Item name="vaccineName" label="Vacina" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="applicationDate" label="Data" rules={[{ required: true }]}>
            <MaskedDatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="doseNumber" label="Dose">
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="batchNumber" label="Lote">
            <Input />
          </Form.Item>
          <Form.Item name="clinic" label="Local">
            <CarePlaceAutocomplete />
          </Form.Item>
          <Form.Item name="appliedBy" label="Aplicado por">
            <Input />
          </Form.Item>
          <Form.Item name="notes" label="Observações">
            <Input.TextArea rows={2} />
          </Form.Item>
          {roleField('vaccine')}
        </Form>
      </Modal>

      <Modal
        open={linkOpen}
        title={`Vincular ${ENTITY_LABEL[linkEntityType].toLowerCase()} existente`}
        onCancel={() => setLinkOpen(false)}
        onOk={() => linkArtifact()}
        okText="Vincular"
        destroyOnClose
      >
        <Form form={linkForm} layout="vertical">
          <Form.Item name="entityId" label={ENTITY_LABEL[linkEntityType]} rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={linkOptions} />
          </Form.Item>
          {roleField(linkEntityType)}
        </Form>
      </Modal>

      <LinkRoleHelpModal
        open={roleHelpOpen}
        onClose={() => setRoleHelpOpen(false)}
        entityType={roleHelpEntity ? ENTITY_LABEL[roleHelpEntity as LinkEntityType] : undefined}
      />
    </>
  )
}
