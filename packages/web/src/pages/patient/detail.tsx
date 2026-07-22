import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Tabs, Card, Avatar, Spin, Typography, Button, Tag, Popconfirm, App } from 'antd'
import { ArrowLeftOutlined, EditOutlined, DeleteOutlined, ManOutlined, WomanOutlined } from '@ant-design/icons'
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

export function PatientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const { t } = useTranslation()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    api.patients.get(id).then(setPatient).catch(() => message.error(t('patient.notFound'))).finally(() => setLoading(false))
  }, [id])

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
              <Button size="small" icon={<EditOutlined />} />
              <Popconfirm title={t('patient.deleteConfirm')} onConfirm={() => api.patients.delete(patient.id).then(() => { message.success('OK'); navigate('/') })}>
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Tag>{age}</Tag>
              {patient.gender === 'male' && <Tag icon={<ManOutlined />} color="blue">{t('patient.male')}</Tag>}
              {patient.gender === 'female' && <Tag icon={<WomanOutlined />} color="pink">{t('patient.female')}</Tag>}
              {patient.weightKg && <Tag color="green">{patient.weightKg} {t('patient.weight')}</Tag>}
              {patient.heightCm && <Tag color="cyan">{patient.heightCm} {t('patient.height')}</Tag>}
              {patient.bloodType && <Tag color="purple">{t('patient.bloodType')} {patient.bloodType}</Tag>}
            </div>
          </div>
        </div>
      </Card>

      <Card style={{ borderRadius: 16 }} bodyStyle={{ padding: 0 }}>
        <Tabs
          defaultActiveKey="growth"
          tabBarStyle={{ padding: '0 24px', margin: 0 }}
          items={[
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
    </div>
  )
}

function calcAge(birthDate: string, t: (k: string) => string): string {
  const months = Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
  return months < 24 ? `${months} ${t('patient.months')}` : `${Math.floor(months / 12)} ${t('patient.age')}`
}
