import { Avatar, Button, Card, Tag, Typography } from 'antd'
import { ArrowLeftOutlined, EditOutlined, ManOutlined, PhoneOutlined, WomanOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { Patient } from '../../lib/api.types.js'

const { Title } = Typography

type Props = {
  patient: Patient
  age: string
  onBack: () => void
  onEdit?: () => void
  onEmergency?: () => void
  showActions?: boolean
}

/** Hero perfil S0 — Voltar + avatar; some com parallax (`--patient-chrome-p`). */
export function PatientCompactProfileHero({
  patient,
  age,
  onBack,
  onEdit,
  onEmergency,
  showActions = true,
}: Props) {
  const { t } = useTranslation()

  return (
    <div className="patient-compact-profile-hero" data-testid="patient-compact-profile-hero">
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        className="patient-compact-profile-hero__back"
        onClick={onBack}
      >
        {t('common.back')}
      </Button>
      <Card style={{ borderRadius: 16, overflow: 'clip' }} styles={{ body: { padding: 16 } }}>
        <div className="patient-compact-profile-hero__row">
          <Avatar
            size={96}
            src={patient.photoUrl}
            style={{
              backgroundColor: patient.gender === 'female' ? '#EC4899' : '#4F46E5',
              fontSize: 40,
              flexShrink: 0,
            }}
          >
            {patient.name.charAt(0).toUpperCase()}
          </Avatar>
          <div className="patient-compact-profile-hero__meta">
            <div className="patient-compact-profile-hero__title-row">
              <Title level={4} style={{ margin: 0 }}>
                {patient.name}
              </Title>
              {showActions && onEmergency ? (
                <Button
                  size="small"
                  danger
                  type="primary"
                  icon={<PhoneOutlined />}
                  onClick={onEmergency}
                >
                  {t('nav.emergency')}
                </Button>
              ) : null}
              {showActions && onEdit ? (
                <Button size="small" icon={<EditOutlined />} onClick={onEdit} aria-label={t('common.edit')} />
              ) : null}
            </div>
            <div className="patient-compact-profile-hero__tags">
              <Tag>{age}</Tag>
              <Tag color="geekblue">
                {t(`patient.category.${patient.ageCategory}`, { defaultValue: patient.ageCategory })}
              </Tag>
              {patient.gender === 'male' && (
                <Tag icon={<ManOutlined />} color="blue">
                  {t('patient.male')}
                </Tag>
              )}
              {patient.gender === 'female' && (
                <Tag icon={<WomanOutlined />} color="pink">
                  {t('patient.female')}
                </Tag>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}