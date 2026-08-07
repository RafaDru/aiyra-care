import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Tabs, Card, Avatar, Spin, Typography, Button, Tag, Popconfirm, App, Modal, Form, Input, Select, Descriptions, Divider, Space } from 'antd'
import { MaskedDatePicker } from '../../components/ui/MaskedDatePicker.js'
import { ArrowLeftOutlined, EditOutlined, DeleteOutlined, ManOutlined, WomanOutlined, UserOutlined, LinkOutlined, IdcardOutlined, FileProtectOutlined, HistoryOutlined } from '@ant-design/icons'
import { SyncProgressModal } from '../../components/scraper/SyncProgressModal.js'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api.js'
import type { Patient, IntegrationLink } from '../../lib/api.types.js'
import { GrowthTab } from './tabs/GrowthTab.js'
import { VaccinesTab } from './tabs/VaccinesTab.js'
import { MedicationsTab } from './tabs/MedicationsTab.js'
import { AllergiesTab } from './tabs/AllergiesTab.js'
import { ExamsTab } from './tabs/ExamsTab.js'
import { DocumentsTab } from './tabs/DocumentsTab.js'
import { PersonalDocumentsTab } from './tabs/PersonalDocumentsTab.js'
import { MedicalRecordsTab } from './tabs/MedicalRecordsTab.js'
import { DiagnosesTab } from './tabs/DiagnosesTab.js'
import { AuthorizationsTab } from './tabs/AuthorizationsTab.js'
import { WalletTab } from './tabs/WalletTab.js'
import { TimelineTab } from './tabs/TimelineTab.js'
import { PatientContextPanel } from '../../components/patient/PatientContextPanel.js'
import { HealthThreadsPanel } from '../../components/patient/HealthThreadsPanel.js'
import '../../components/patient/patient-basic-summary.css'

const { Title, Text } = Typography

const CATEGORY_LABEL: Record<string, string> = {
  children: 'Criança',
  adolescents: 'Adolescente',
  adults: 'Adulto',
}

const PATIENT_TAB_KEYS = new Set([
  'basic', 'timeline', 'personal-documents', 'wallet', 'growth', 'vaccines',
  'medications', 'allergies', 'exams', 'records', 'authorizations', 'diagnoses', 'documents',
])

export function PatientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { message } = App.useApp()
  const { t } = useTranslation()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [parents, setParents] = useState<Patient[]>([])
  const [children, setChildren] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm] = Form.useForm()
  const [allPatients, setAllPatients] = useState<Patient[]>([])
  const [integrationLinks, setIntegrationLinks] = useState<IntegrationLink[]>([])
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [linkPortal, setLinkPortal] = useState<'unimed' | 'amil' | 'bradesco_saude' | 'mater_dei'>('unimed')
  const [linkForm] = Form.useForm()
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [syncJobId, setSyncJobId] = useState<string | null>(null)
  const [syncPortalType, setSyncPortalType] = useState<'unimed' | 'amil' | 'mater_dei' | null>(null)

  const tabFromUrl = searchParams.get('tab')
  const activeTab = tabFromUrl && PATIENT_TAB_KEYS.has(tabFromUrl) ? tabFromUrl : 'basic'

  const setActiveTab = useCallback((key: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (key === 'basic') next.delete('tab')
      else next.set('tab', key)
      return next
    }, { replace: true })
  }, [setSearchParams])

  const load = () => {
    if (!id) return
    Promise.all([
      api.patients.get(id),
      api.patients.list(),
      api.integrationLinks.list(id),
    ]).then(([p, list, links]) => {
      setPatient(p)
      setAllPatients(list)
      setParents(list.filter(x => p.parentIds.includes(x.id)))
      setChildren(list.filter(x => x.parentIds.includes(p.id)))
      setIntegrationLinks(links)
    }).catch(() => message.error(t('patient.notFound'))).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const SYNCABLE_PORTALS = new Set(['unimed', 'amil', 'mater_dei'])
  const CPF_LOGIN_PORTALS = new Set(['amil', 'bradesco_saude', 'mater_dei'])

  const formatCpf = (cpf: string) => {
    const digits = cpf.replace(/\D/g, '')
    if (digits.length !== 11) return cpf
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
  }

  const openLinkModal = async (portal: 'unimed' | 'amil' | 'bradesco_saude' | 'mater_dei') => {
    setLinkPortal(portal)
    linkForm.resetFields()
    setLinkModalOpen(true)

    const defaults: { email?: string; cardNumber?: string } = {}
    if (CPF_LOGIN_PORTALS.has(portal) && patient?.cpf) {
      defaults.email = formatCpf(patient.cpf)
    }

    if (id) {
      try {
        const memberships = await api.planMemberships.list(id)
        const match = memberships.find((m) =>
          m.plan?.operator === portal || m.source === portal,
        )
        if (match?.memberNumber) defaults.cardNumber = match.memberNumber
      } catch {
        // optional prefill — ignore
      }
    }

    if (defaults.email || defaults.cardNumber) {
      linkForm.setFieldsValue(defaults)
    }
  }

  const startSync = async (linkId: string, portalTypeHint?: string) => {
    const link = integrationLinks.find((l) => l.id === linkId)
    const portalType = portalTypeHint ?? link?.portalType
    setSyncingId(linkId)
    if (portalType && SYNCABLE_PORTALS.has(portalType)) {
      setSyncPortalType(portalType as 'unimed' | 'amil' | 'mater_dei')
    }
    try {
      const r = await api.integrationLinks.sync(linkId)
      setSyncJobId(r.jobId)
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Erro na sincronização')
      setSyncPortalType(null)
    } finally {
      setSyncingId(null)
    }
  }

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
          activeKey={activeTab}
          onChange={setActiveTab}
          tabBarStyle={{ padding: '0 24px', margin: 0 }}
          destroyInactiveTabPane
          items={[
            {
              key: 'basic', label: <><UserOutlined /> Dados Básicos</>,
              children: (
                <div style={{ padding: 24 }}>
                  <div className="patient-basic-summary-row">
                    <div className="patient-basic-summary-row__clinical">
                      <PatientContextPanel patientId={patient.id} />
                    </div>
                    <div className="patient-basic-summary-row__threads">
                      <HealthThreadsPanel patientId={patient.id} layout="sidebar" />
                    </div>
                  </div>
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
            {
              key: 'timeline',
              label: <><HistoryOutlined /> {t('tabs.timeline')}</>,
              children: (
                <div style={{ padding: 24 }}>
                  <TimelineTab patientId={patient.id} />
                </div>
              ),
            },
            {
              key: 'personal-documents',
              label: <><FileProtectOutlined /> {t('tabs.personalDocuments')}</>,
              children: (
                <div style={{ padding: 24 }}>
                  <PersonalDocumentsTab patientId={patient.id} />
                </div>
              ),
            },
            {
              key: 'wallet',
              label: <><IdcardOutlined /> {t('tabs.wallet')}</>,
              children: (
                <div style={{ padding: 24 }}>
                  <WalletTab
                    patient={patient}
                    links={integrationLinks}
                    syncingId={syncingId}
                    onSync={startSync}
                    onRemoved={load}
                    onLinkPortal={(portal) => { void openLinkModal(portal) }}
                    onCardUpdated={load}
                    linkedChildrenCount={children.length}
                  />
                </div>
              ),
            },
            { key: 'growth', label: t('tabs.growth'), children: <div style={{ padding: 24 }}><GrowthTab patientId={patient.id} /></div> },
            { key: 'vaccines', label: t('tabs.vaccines'), children: <div style={{ padding: 24 }}><VaccinesTab patientId={patient.id} /></div> },
            { key: 'medications', label: t('tabs.medications'), children: <div style={{ padding: 24 }}><MedicationsTab patientId={patient.id} /></div> },
            { key: 'allergies', label: t('tabs.allergies'), children: <div style={{ padding: 24 }}><AllergiesTab patientId={patient.id} /></div> },
            { key: 'exams', label: t('tabs.exams'), children: <div style={{ padding: 24 }}><ExamsTab patientId={patient.id} /></div> },
            { key: 'records', label: t('tabs.records'), children: <div style={{ padding: 24 }}><MedicalRecordsTab patientId={patient.id} /></div> },
            { key: 'authorizations', label: 'Autorizações', children: <div style={{ padding: 24 }}><AuthorizationsTab patientId={patient.id} /></div> },
            { key: 'diagnoses', label: t('tabs.diagnoses'), children: <div style={{ padding: 24 }}><DiagnosesTab patientId={patient.id} /></div> },
            { key: 'documents', label: t('tabs.documents'), children: <div style={{ padding: 24 }}><DocumentsTab patientId={patient.id} onPatientUpdated={load} onOpenExamsTab={() => setActiveTab('exams')} /></div> },
          ]}
        />
      </Card>

      <Modal title={`Vincular ${
        linkPortal === 'unimed' ? 'Unimed BH'
          : linkPortal === 'amil' ? 'Amil'
            : linkPortal === 'mater_dei' ? 'Meu Mater Dei'
              : 'Bradesco Saúde'
      }`} open={linkModalOpen} confirmLoading={syncingId !== null} onOk={async () => {
        try {
          const values = await linkForm.validateFields()
          const login = CPF_LOGIN_PORTALS.has(linkPortal)
            ? String(values.email || '').replace(/\D/g, '')
            : values.email
          const link = await api.integrationLinks.create({
            patientId: id!,
            portalType: linkPortal,
            email: login,
            password: values.password,
            cardNumber: values.cardNumber?.replace(/\s/g, '') || undefined,
          })
          setLinkModalOpen(false)
          load()
          if (SYNCABLE_PORTALS.has(linkPortal)) {
            message.success('Portal vinculado! Iniciando primeira sincronização...')
            await startSync(link.id)
          } else {
            message.success('Portal vinculado!')
          }
        } catch (err) {
          if (err && typeof err === 'object' && 'errorFields' in err) return
          message.error(err instanceof Error ? err.message : 'Erro ao vincular')
        }
      }} onCancel={() => setLinkModalOpen(false)} okText={SYNCABLE_PORTALS.has(linkPortal) ? 'Vincular e sincronizar' : 'Vincular'} cancelText={t('common.cancel')} width={400}>
        <Form form={linkForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="email"
            label={
              linkPortal === 'unimed' ? 'E-mail de acesso'
                : linkPortal === 'mater_dei' ? 'CPF (Meu Mater Dei)'
                  : linkPortal === 'amil' ? 'CPF'
                    : 'CPF / usuário'
            }
            rules={
              linkPortal === 'unimed'
                ? [{ required: true, type: 'email', message: 'Informe o e-mail' }]
                : CPF_LOGIN_PORTALS.has(linkPortal)
                  ? [
                      { required: true, message: 'Informe o CPF' },
                      {
                        validator: (_, value) => {
                          const digits = String(value || '').replace(/\D/g, '')
                          if (digits.length === 11) return Promise.resolve()
                          return Promise.reject(new Error('CPF deve ter 11 dígitos'))
                        },
                      },
                    ]
                  : [{ required: true }]
            }
            extra={
              CPF_LOGIN_PORTALS.has(linkPortal) && patient?.cpf
                ? 'Pré-preenchido com o CPF do paciente'
                : undefined
            }
          >
            <Input
              placeholder={
                linkPortal === 'unimed' ? 'seu@email.com'
                  : '000.000.000-00'
              }
              inputMode={CPF_LOGIN_PORTALS.has(linkPortal) ? 'numeric' : undefined}
            />
          </Form.Item>
          <Form.Item name="password" label="Senha" rules={[{ required: true }]}>
            <Input.Password placeholder="Senha do portal" />
          </Form.Item>
          <Form.Item name="cardNumber" label="Nº da Carteirinha (opcional)">
            <Input placeholder="Número da carteirinha" />
          </Form.Item>
        </Form>
      </Modal>

      <SyncProgressModal
        jobId={syncJobId}
        portalType={syncPortalType}
        holderPatientId={patient.id}
        onDone={() => { setSyncJobId(null); setSyncPortalType(null); load() }}
        onError={(msg) => { message.error(msg, 8) }}
        onResync={() => {
          const portal = syncPortalType ?? 'amil'
          const link = integrationLinks.find((l) => l.portalType === portal)
          if (link) startSync(link.id)
        }}
      />

      <Modal title="Editar Dados do Paciente" open={editOpen} onOk={handleEditSave} onCancel={() => setEditOpen(false)} okText={t('common.save')} cancelText={t('common.cancel')} width={560}>
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Nome" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="birthDate" label="Data de Nascimento" rules={[{ required: true }]}>
            <MaskedDatePicker style={{ width: '100%' }} />
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
