import { useEffect, useState } from 'react'
import { Row, Col, Card, Avatar, Typography, Spin, Empty, Button, Tag, Modal, Form, Input, Select, App, Alert } from 'antd'
import { MaskedDatePicker } from '../components/ui/MaskedDatePicker.js'
import { PlusOutlined, ManOutlined, WomanOutlined, UserSwitchOutlined, FireOutlined, SmileOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api.js'
import type { Patient } from '../lib/api.types.js'
import { PageHeader } from '../components/ui/PageHeader.js'
import { useAuth } from '../contexts/AuthContext.js'

const { Title, Text } = Typography

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  children: { label: 'Crianças', icon: <SmileOutlined />, color: '#0D9488' },
  adolescents: { label: 'Adolescentes', icon: <FireOutlined />, color: '#E11D48' },
  adults: { label: 'Adultos', icon: <UserSwitchOutlined />, color: '#4F46E5' },
}

export function Dashboard() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const { loading: authLoading, session, configured: authConfigured } = useAuth()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()
  const navigate = useNavigate()

  const load = () => {
    setLoadError(null)
    return api.patients.list()
      .then(setPatients)
      .catch((err) => {
        setPatients([])
        setLoadError(err instanceof Error ? err.message : 'Falha ao carregar pacientes')
      })
  }
  useEffect(() => {
    if (authConfigured && (authLoading || !session)) return
    load().finally(() => setLoading(false))
  }, [authConfigured, authLoading, session])

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      await api.patients.create({
        name: values.name,
        birthDate: values.birthDate.toISOString(),
        gender: values.gender || undefined,
        weightKg: values.weightKg ? Number(values.weightKg) : undefined,
        heightCm: values.heightCm ? Number(values.heightCm) : undefined,
        cpf: values.cpf?.replace(/\D/g, '') || undefined,
        cns: values.cns?.replace(/\D/g, '') || undefined,
      })
      message.success('Paciente cadastrado com sucesso')
      setModalOpen(false)
      form.resetFields()
      load()
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      message.error(err instanceof Error ? err.message : 'Erro desconhecido')
    }
  }

  const grouped = ['adults', 'adolescents', 'children'].reduce((acc, cat) => {
    const list = patients.filter(p => p.ageCategory === cat)
    if (list.length) acc[cat] = list
    return acc
  }, {} as Record<string, Patient[]>)

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />

  return (
    <div>
      <PageHeader
        title={t('patient.title')}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>{t('patient.new')}</Button>}
      />

      {loadError && (
        <Alert
          type="error"
          showIcon
          message="Não foi possível carregar os pacientes"
          description={loadError}
          action={<Button size="small" onClick={() => { setLoading(true); load().finally(() => setLoading(false)) }}>Tentar novamente</Button>}
          style={{ marginBottom: 16 }}
        />
      )}

      {patients.length === 0 && !loadError ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span>
              {t('common.empty')}<br />
              <Button type="link" icon={<PlusOutlined />} onClick={() => setModalOpen(true)} style={{ marginTop: 8 }}>
                {t('patient.new')}
              </Button>
            </span>
          }
          style={{ marginTop: 80 }}
        />
      ) : (
        Object.entries(grouped).map(([cat, list]) => {
          const cfg = CATEGORY_CONFIG[cat]
          return (
            <div key={cat} style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 22, color: cfg.color }}>{cfg.icon}</span>
                <Title level={4} style={{ margin: 0, color: cfg.color }}>{cfg.label}</Title>
                <Tag color={cfg.color}>{list.length}</Tag>
              </div>
              <Row gutter={[20, 20]}>
                {list.map((p) => (
                  <Col xs={24} sm={12} lg={8} xl={6} key={p.id}>
                    <PatientCard patient={p} onClick={() => navigate(`/patients/${p.id}`)} />
                  </Col>
                ))}
              </Row>
            </div>
          )
        })
      )}

      <Modal title={t('patient.new')} open={modalOpen} onOk={handleCreate} onCancel={() => setModalOpen(false)} okText={t('common.save')} cancelText={t('common.cancel')}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Nome" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="birthDate" label="Data de Nascimento" rules={[{ required: true }]}>
            <MaskedDatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="gender" label="Sexo">
            <Select options={[{ value: 'male', label: t('patient.male') }, { value: 'female', label: t('patient.female') }]} allowClear />
          </Form.Item>
          <Form.Item name="weightKg" label={`Peso (${t('patient.weight')})`}><Input type="number" step="0.1" /></Form.Item>
          <Form.Item name="heightCm" label={`Altura (${t('patient.height')})`}><Input type="number" step="0.1" /></Form.Item>
          <Form.Item name="cpf" label="CPF" rules={[{ validator: (_, v) => !v || v.replace(/\D/g, '').length === 11 ? Promise.resolve() : Promise.reject('CPF deve ter 11 dígitos') }]}>
            <Input placeholder="000.000.000-00" maxLength={14} />
          </Form.Item>
          <Form.Item name="cns" label="CNS"><Input placeholder="Nº do Cartão SUS" maxLength={15} /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

function PatientCard({ patient, onClick }: { patient: Patient; onClick: () => void }) {
  const { t } = useTranslation()
  const age = calcAge(patient.birthDate, t)
  const catCfg = CATEGORY_CONFIG[patient.ageCategory]

  return (
    <Card
      hoverable
      onClick={onClick}
      style={{ borderRadius: 16, textAlign: 'center', cursor: 'pointer', height: '100%' }}
      styles={{ body: { padding: 32 } }}
    >
      <Avatar
        size={88}
        src={patient.photoUrl}
        style={{ backgroundColor: patient.gender === 'female' ? '#EC4899' : '#4F46E5', fontSize: 36, marginBottom: 12 }}
      >
        {patient.name.charAt(0).toUpperCase()}
      </Avatar>
      <Title level={5} style={{ margin: '8px 0 4px' }}>{patient.name}</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>{age}</Text>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
        {catCfg && <Tag icon={catCfg.icon} color={catCfg.color}>{catCfg.label}</Tag>}
        {patient.gender === 'male' && <Tag icon={<ManOutlined />} color="blue">{t('patient.male')}</Tag>}
        {patient.gender === 'female' && <Tag icon={<WomanOutlined />} color="pink">{t('patient.female')}</Tag>}
        {patient.weightKg && <Tag color="green">{patient.weightKg} {t('patient.weight')}</Tag>}
        {patient.heightCm && <Tag color="cyan">{patient.heightCm} {t('patient.height')}</Tag>}
      </div>
    </Card>
  )
}

function calcAge(birthDate: string, t: (key: string) => string): string {
  if (!birthDate) return '-'
  const months = Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
  return months < 24 ? `${months} ${t('patient.months')}` : `${Math.floor(months / 12)} ${t('patient.age')}`
}
