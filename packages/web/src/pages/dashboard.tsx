import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Row, Col, Card, Avatar, Typography, Spin, Empty, Button, Tag } from 'antd'
import { PlusOutlined, ManOutlined, WomanOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api.js'
import type { Patient } from '../lib/api.types.js'
import { PageHeader } from '../components/ui/PageHeader.js'

const { Title, Text } = Typography

export function Dashboard() {
  const { t } = useTranslation()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.patients.list().then(setPatients).finally(() => setLoading(false))
  }, [])

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />

  return (
    <div>
      <PageHeader
        title={t('patient.title')}
        extra={<Button type="primary" icon={<PlusOutlined />}>{t('patient.new')}</Button>}
      />

      {patients.length === 0 ? (
        <Empty description={t('common.empty')} style={{ marginTop: 80 }} />
      ) : (
        <Row gutter={[20, 20]}>
          {patients.map((p) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={p.id}>
              <PatientCard patient={p} onClick={() => navigate(`/patients/${p.id}`)} />
            </Col>
          ))}
        </Row>
      )}
    </div>
  )
}

function PatientCard({ patient, onClick }: { patient: Patient; onClick: () => void }) {
  const { t } = useTranslation()
  const age = calcAge(patient.birthDate, t)

  return (
    <Card
      hoverable
      onClick={onClick}
      style={{ borderRadius: 16, textAlign: 'center', cursor: 'pointer', height: '100%' }}
      bodyStyle={{ padding: 32 }}
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
        {patient.gender === 'male' && <Tag icon={<ManOutlined />} color="blue">{t('patient.male')}</Tag>}
        {patient.gender === 'female' && <Tag icon={<WomanOutlined />} color="pink">{t('patient.female')}</Tag>}
        {patient.weightKg && <Tag color="green">{patient.weightKg} {t('patient.weight')}</Tag>}
        {patient.heightCm && <Tag color="cyan">{patient.heightCm} {t('patient.height')}</Tag>}
      </div>
    </Card>
  )
}

function calcAge(birthDate: string, t: (key: string) => string): string {
  const diff = Date.now() - new Date(birthDate).getTime()
  const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30.44))
  if (months < 24) return `${months} ${t('patient.months')}`
  return `${Math.floor(months / 12)} ${t('patient.age')}`
}
