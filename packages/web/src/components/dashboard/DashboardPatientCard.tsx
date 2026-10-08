import { Card, Avatar, Typography, Tag } from 'antd'
import { ManOutlined, WomanOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { Patient } from '../../lib/api.types.js'
import type { PatientCircleMeta } from '../../lib/dashboard/group-patients-for-dashboard.js'

const { Title, Text } = Typography

const CATEGORY_I18N: Record<string, string> = {
  children: 'dashboard.ageBand.children',
  adolescents: 'dashboard.ageBand.adolescents',
  adults: 'dashboard.ageBand.adults',
}

const CATEGORY_COLOR: Record<string, string> = {
  children: '#0D9488',
  adolescents: '#E11D48',
  adults: '#4F46E5',
}

interface DashboardPatientCardProps {
  patient: Patient
  onClick: () => void
  circleMeta?: PatientCircleMeta | null
  showCircleTag?: boolean
}

export function DashboardPatientCard({
  patient,
  onClick,
  circleMeta,
  showCircleTag = false,
}: DashboardPatientCardProps) {
  const { t } = useTranslation()
  const age = calcAge(patient.birthDate, t)
  const catKey = CATEGORY_I18N[patient.ageCategory]
  const catColor = CATEGORY_COLOR[patient.ageCategory]

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
        style={{
          backgroundColor: patient.gender === 'female' ? '#EC4899' : '#4F46E5',
          fontSize: 36,
          marginBottom: 12,
        }}
      >
        {patient.name.charAt(0).toUpperCase()}
      </Avatar>
      <Title level={5} style={{ margin: '8px 0 4px' }}>{patient.name}</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>{age}</Text>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
        {showCircleTag && circleMeta?.circleName && (
          <Tag color={circleMeta.circleColor}>{circleMeta.circleName}</Tag>
        )}
        {catKey && <Tag color={catColor}>{t(catKey)}</Tag>}
        {patient.gender === 'male' && <Tag icon={<ManOutlined />} color="blue">{t('patient.male')}</Tag>}
        {patient.gender === 'female' && <Tag icon={<WomanOutlined />} color="pink">{t('patient.female')}</Tag>}
        {patient.isSelf && <Tag color="purple">{t('patient.you')}</Tag>}
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
