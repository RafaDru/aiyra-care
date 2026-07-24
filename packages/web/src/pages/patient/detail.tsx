import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Tabs, Card, Avatar, Spin, Typography, Button, Tag, Popconfirm, App, Modal, Form, Input, DatePicker, Select, Descriptions, Divider, Space } from 'antd'
import { ArrowLeftOutlined, EditOutlined, DeleteOutlined, ManOutlined, WomanOutlined, UserOutlined, LinkOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api.js'
import type { Patient } from '../../lib/api.types.js'
import { GrowthTab } from './tabs/GrowthTab.js'
import { VaccinesTab } from './tabs/VaccinesTab.js'
import { MedicationsTab } from './tabs/MedicationsTab.js'
import { AllergiesTab } from './tabs/AllergiesTab.js'
import { ExamsTab } from './tabs/ExamsTab.js'
import { DocumentsTab } from './tabs/DocumentsTab.js'
import { MedicalRecordsTab } from './tabs/MedicalRecordsTab.js'
import { DiagnosesTab } from './tabs/DiagnosesTab.js'

const { Title, Text } = Typography

const CATEGORY_LABEL: Record<string, string> = {
  children: 'Criança',
  adolescents: 'Adolescente',
  adults: 'Adulto',
}

export function PatientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const { t } = useTranslation()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [parents, setParents] = useState<Patient[]>([])
  const [children, setChildren] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm] = Form.useForm()
  const [allPatients, setAllPatients] = useState<Patient[]>([])

  const load = () => {
    if (!id) return
    Promise.all([
      api.patients.get(id),
      api.patients.list(),
    ]).then(([p, list]) => {
      setPatient(p)
      setAllPatients(list)
      setParents(list.filter(x => p.parentIds.includes(x.id)))
      setChildren(list.filter(x => x.parentIds.includes(p.id)))
    }).catch(() => message.error(t('patient.notFound'))).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const handleEditOpen = () => {
    if (!patient) return
    editForm.setFieldsValue({
      name: patient.name,
      birthDate: patient.birthDate ? dayjs(patient.birthDate) : undefined,
      gender: patient.gender,
      bloodType: patient.bloodType,
      weightKg: patient.weightKg,
      heightCm: patient.heightCm,
      parentIds: patient.parentIds,
      cpf: patient.cpf,
      cns: patient.cns,
    })
    setEditOpen(true)
  }

  const handleEditSave = async () => {
    try {
      const values = await editForm.validateFields()
      await api.patients.update(id!, {
        name: values.name,
        birthDate: values.birthDate?.toISOString(),
        gender: values.gender || undefined,
        bloodType: values.bloodType || undefined,
        weightKg: values.weightKg ? Number(values.weightKg) : undefined,
        heightCm: values.heightCm ? Number(values.heightCm) : undefined,
        parentIds: values.parentIds || [],
        cpf: values.cpf?.replace(/\D/g, '') || undefined,
        cns: values.cns?.replace(/\D/g, '') || undefined,
      })
      message.success('Dados atualizados')
      setEditOpen(false)
      load()
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      message.error(err instanceof Error ? err.message : 'Erro ao salvar')
    }
  }

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />
  if (!patient) return <Text type="danger">{t('patient.notFound')}</Text>

  const age = calcAge(patient.birthDate, t)

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} style={{ marginBottom: 16 }}>
        {t('common.back')}
      </Button>

      <Card style={{ borderRadius: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <Avatar size={96} src={patient.photoUrl} style={{ backgroundColor: patient.gender === 'female' ? '#EC4899' : '#4F46E5', fontSize: 40 }}>
            {patient.name.charAt(0).toUpperCase()}
          </Avatar>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Title level={4} style={{ margin: 0 }}>{patient.name}</Title>
              <Button size="small" icon={<EditOutlined />} onClick={handleEditOpen} />
              <Popconfirm title={t('patient.deleteConfirm')} onConfirm={async () => { try { await api.patients.delete(patient.id); message.success('OK'); navigate('/') } catch (e) { message.error(e instanceof Error ? e.message : 'Erro ao excluir') } }}>
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Tag>{age}</Tag>
              <Tag color="geekblue">{CATEGORY_LABEL[patient.ageCategory] || patient.ageCategory}</Tag>
              {patient.gender === 'male' && <Tag icon={<ManOutlined />} color="blue">{t('patient.male')}</Tag>}
              {patient.gender === 'female' && <Tag icon={<WomanOutlined />} color="pink">{t('patient.female')}</Tag>}
              {patient.weightKg && <Tag color="green">{patient.weightKg} {t('patient.weight')}</Tag>}
              {patient.heightCm && <Tag color="cyan">{patient.heightCm} {t('patient.height')}</Tag>}
              {patient.bloodType && <Tag color="purple">{t('patient.bloodType')} {patient.bloodType}</Tag>}
            </div>
          </div>
        </div>
      </Card>

      <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 0 } }}>
        <Tabs
          defaultActiveKey="basic"
          tabBarStyle={{ padding: '0 24px', margin: 0 }}
          destroyInactiveTabPane
          items={[
            {
              key: 'basic', label: <><UserOutlined /> Dados Básicos</>,
              children: (
                <div style={{ padding: 24 }}>
                  <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
                    <Descriptions.Item label="Nome">{patient.name}</Descriptions.Item>
                    <Descriptions.Item label="Data de Nascimento">{patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('pt-BR') : '-'}</Descriptions.Item>
                    <Descriptions.Item label="Sexo">{patient.gender === 'male' ? t('patient.male') : patient.gender === 'female' ? t('patient.female') : '-'}</Descriptions.Item>
                    <Descriptions.Item label="Tipo Sanguíneo">{patient.bloodType || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Peso">{patient.weightKg ? `${patient.weightKg} ${t('patient.weight')}` : '-'}</Descriptions.Item>
                    <Descriptions.Item label="Altura">{patient.heightCm ? `${patient.heightCm} ${t('patient.height')}` : '-'}</Descriptions.Item>
                    <Descriptions.Item label="CPF">{patient.cpf ? `${patient.cpf.slice(0,3)}.${patient.cpf.slice(3,6)}.${patient.cpf.slice(6,9)}-${patient.cpf.slice(9)}` : '-'}</Descriptions.Item>
                    <Descriptions.Item label="CNS">{patient.cns || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Idade">{age}</Descriptions.Item>
                    <Descriptions.Item label="Categoria">
                      <Tag color="geekblue">{CATEGORY_LABEL[patient.ageCategory] || patient.ageCategory}</Tag>
                    </Descriptions.Item>
                  </Descriptions>

                  {(parents.length > 0 || children.length > 0) && (
                    <>
                      <Divider><LinkOutlined /> Relações Familiares</Divider>
                      {parents.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <Text strong>Pais/Responsáveis:</Text>
                          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                            {parents.map(p => (
                              <Tag key={p.id} color="purple" style={{ cursor: 'pointer' }} onClick={() => navigate(`/patients/${p.id}`)}>
                                {p.name}
                              </Tag>
                            ))}
                          </div>
                        </div>
                      )}
                      {children.length > 0 && (
                        <div>
                          <Text strong>Filhos:</Text>
                          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                            {children.map(p => (
                              <Tag key={p.id} color="cyan" style={{ cursor: 'pointer' }} onClick={() => navigate(`/patients/${p.id}`)}>
                                {p.name}
                              </Tag>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <Divider />
                  <Space>
                    <Button type="primary" icon={<EditOutlined />} onClick={handleEditOpen}>Editar Dados</Button>
                  </Space>
                </div>
              ),
            },
            { key: 'growth', label: t('tabs.growth'), children: <div style={{ padding: 24 }}><GrowthTab patientId={patient.id} /></div> },
            { key: 'vaccines', label: t('tabs.vaccines'), children: <div style={{ padding: 24 }}><VaccinesTab patientId={patient.id} /></div> },
            { key: 'medications', label: t('tabs.medications'), children: <div style={{ padding: 24 }}><MedicationsTab patientId={patient.id} /></div> },
            { key: 'allergies', label: t('tabs.allergies'), children: <div style={{ padding: 24 }}><AllergiesTab patientId={patient.id} /></div> },
            { key: 'exams', label: t('tabs.exams'), children: <div style={{ padding: 24 }}><ExamsTab patientId={patient.id} /></div> },
            { key: 'records', label: t('tabs.records'), children: <div style={{ padding: 24 }}><MedicalRecordsTab patientId={patient.id} /></div> },
            { key: 'diagnoses', label: t('tabs.diagnoses'), children: <div style={{ padding: 24 }}><DiagnosesTab patientId={patient.id} /></div> },
            { key: 'documents', label: t('tabs.documents'), children: <div style={{ padding: 24 }}><DocumentsTab patientId={patient.id} /></div> },
          ]}
        />
      </Card>

      <Modal title="Editar Dados do Paciente" open={editOpen} onOk={handleEditSave} onCancel={() => setEditOpen(false)} okText={t('common.save')} cancelText={t('common.cancel')} width={560}>
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Nome" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="birthDate" label="Data de Nascimento" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="gender" label="Sexo">
            <Select options={[{ value: 'male', label: t('patient.male') }, { value: 'female', label: t('patient.female') }]} allowClear />
          </Form.Item>
          <Form.Item name="bloodType" label="Tipo Sanguíneo">
            <Select options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(v => ({ value: v, label: v }))} allowClear />
          </Form.Item>
          <Form.Item name="weightKg" label={`Peso (${t('patient.weight')})`}><Input type="number" step="0.1" /></Form.Item>
          <Form.Item name="heightCm" label={`Altura (${t('patient.height')})`}><Input type="number" step="0.1" /></Form.Item>
          <Form.Item name="cpf" label="CPF"><Input placeholder="000.000.000-00" maxLength={14} /></Form.Item>
          <Form.Item name="cns" label="CNS"><Input placeholder="Nº do Cartão SUS" maxLength={15} /></Form.Item>
          <Form.Item name="parentIds" label="Pais/Responsáveis">
            <Select
              mode="multiple"
              placeholder="Selecione os pais/responsáveis"
              options={allPatients.filter(p => p.id !== patient?.id).map(p => ({ value: p.id, label: `${p.name} (${CATEGORY_LABEL[p.ageCategory] || p.ageCategory})` }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

function calcAge(birthDate: string, t: (k: string) => string): string {
  if (!birthDate) return '-'
  const ms = Date.now() - new Date(birthDate).getTime()
  if (ms < 0) return '-'
  const months = Math.floor(ms / (1000 * 60 * 60 * 24 * 30.44))
  return months < 24 ? `${months} ${t('patient.months')}` : `${Math.floor(months / 12)} ${t('patient.age')}`
}
