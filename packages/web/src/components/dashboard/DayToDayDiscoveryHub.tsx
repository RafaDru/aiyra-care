import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Space, Typography } from 'antd'
import {
  CarryOutOutlined,
  CloseOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { dismissHint, isHintDismissed } from '../../lib/dismissed-hints.js'
import { requestQuickCaptureOpen } from '../../lib/quick-capture-bus.js'
import { requestConsultVisitOpen } from '../../lib/clinical-export-bus.js'
import { requestPatientCreateOpen } from '../../lib/patient-create-bus.js'

const HINT_ID = 'day-to-day-discovery-hub'

const { Paragraph, Text, Title } = Typography

interface Props {
  patientId?: string | null
  hasPatients: boolean
}

export function DayToDayDiscoveryHub({ patientId, hasPatients }: Props) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(!isHintDismissed(HINT_ID))
  }, [])

  const dismiss = useCallback(() => {
    dismissHint(HINT_ID)
    setVisible(false)
  }, [])

  const scrollToToday = useCallback(() => {
    document.querySelector('.wallet-today-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [])

  if (!visible) return null

  const onCapture = () => {
    if (!hasPatients || !patientId) {
      requestPatientCreateOpen()
      return
    }
    requestQuickCaptureOpen({ patientId })
  }

  const onConsult = () => {
    if (!hasPatients || !patientId) {
      requestPatientCreateOpen()
      return
    }
    requestConsultVisitOpen({ patientId })
  }

  const onToday = () => {
    if (!hasPatients) {
      requestPatientCreateOpen()
      return
    }
    scrollToToday()
  }

  return (
    <Card
      size="small"
      data-testid="day-to-day-discovery-hub"
      style={{ marginBottom: 16, borderColor: '#d1fae5', background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 55%)' }}
      title={
        <Space direction="vertical" size={0}>
          <Title level={5} style={{ margin: 0 }}>{t('dayToDayDiscovery.title')}</Title>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>{t('dayToDayDiscovery.subtitle')}</Text>
        </Space>
      }
      extra={
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          aria-label={t('dayToDayDiscovery.dismiss')}
          onClick={dismiss}
        />
      }
    >
      <Paragraph type="secondary" style={{ marginBottom: 12, fontSize: 13 }}>
        {hasPatients ? t('dayToDayDiscovery.bodyWithPatients') : t('dayToDayDiscovery.bodyNoPatients')}
      </Paragraph>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Button block icon={<PlusOutlined />} type="primary" onClick={onCapture}>
          {t('dayToDayDiscovery.actions.capture')}
        </Button>
        <Button block icon={<UnorderedListOutlined />} onClick={onToday} disabled={hasPatients && !patientId}>
          {t('dayToDayDiscovery.actions.today')}
        </Button>
        <Button block icon={<CarryOutOutlined />} onClick={onConsult}>
          {t('dayToDayDiscovery.actions.consult')}
        </Button>
      </Space>
      <div style={{ marginTop: 10 }}>
        <Text type="secondary" style={{ fontSize: 11 }}>
          <ThunderboltOutlined style={{ marginRight: 4 }} />
          {t('dayToDayDiscovery.footerHint')}
        </Text>
      </div>
    </Card>
  )
}
