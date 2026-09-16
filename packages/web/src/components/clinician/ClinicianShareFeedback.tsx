import { useState } from 'react'
import { Button, Space, Typography } from 'antd'
import { LikeOutlined, DislikeOutlined } from '@ant-design/icons'
import { CLINICAL_EXPORT_COPY } from '../patient/clinical-export-copy.js'
import { trackClinicianShareEvent } from '../../lib/clinician-share-events.js'

const { Text } = Typography

interface ClinicianShareFeedbackProps {
  mode: 'summary' | 'full'
}

export function ClinicianShareFeedback({ mode }: ClinicianShareFeedbackProps) {
  const [answered, setAnswered] = useState(false)

  const handleFeedback = (helpful: boolean) => {
    if (answered) return
    setAnswered(true)
    trackClinicianShareEvent('clinician_share_feedback', { helpful, mode })
  }

  return (
    <div className="clinician-share-feedback">
      <Text type="secondary">{CLINICAL_EXPORT_COPY.clinicianFeedbackPrompt}</Text>
      <Space style={{ marginTop: 8 }}>
        <Button
          type={answered ? 'default' : 'primary'}
          icon={<LikeOutlined />}
          disabled={answered}
          onClick={() => handleFeedback(true)}
        >
          {CLINICAL_EXPORT_COPY.clinicianFeedbackYes}
        </Button>
        <Button
          icon={<DislikeOutlined />}
          disabled={answered}
          onClick={() => handleFeedback(false)}
        >
          {CLINICAL_EXPORT_COPY.clinicianFeedbackNo}
        </Button>
      </Space>
      {answered && (
        <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
          {CLINICAL_EXPORT_COPY.clinicianFeedbackThanks}
        </Text>
      )}
    </div>
  )
}
