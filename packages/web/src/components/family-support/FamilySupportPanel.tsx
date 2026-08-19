import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, Space, Tag, Typography, Button } from 'antd'
import type { AlertProps } from 'antd'
import { HeartOutlined, MedicineBoxOutlined, SafetyCertificateOutlined, PhoneOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api.js'
import type { FamilySupportBundle, FamilySupportInsight } from '../../lib/api.types.js'
import { DismissibleHint } from '../ui/DismissibleHint.js'
import { familySupportHintId, isHintDismissed } from '../../lib/dismissed-hints.js'

const PRIORITY_COLOR: Record<FamilySupportInsight['priority'], string> = {
  critical: 'red',
  urgent: 'red',
  attention: 'orange',
  info: 'blue',
}

const KIND_ICON: Record<FamilySupportInsight['kind'], ReactNode> = {
  vital_alert: <HeartOutlined />,
  medication_safety: <MedicineBoxOutlined />,
  discuss_with_doctor: <SafetyCertificateOutlined />,
  consult_prep: <SafetyCertificateOutlined />,
}

function insightAlertType(priority: FamilySupportInsight['priority']): AlertProps['type'] {
  if (priority === 'critical' || priority === 'urgent') return 'error'
  if (priority === 'attention') return 'warning'
  return 'info'
}

interface Props {
  patientId: string
  medicationName?: string
  healthThreadId?: string
  compact?: boolean
}

export function FamilySupportPanel({ patientId, medicationName, healthThreadId, compact }: Props) {
  const { t } = useTranslation()
  const [bundle, setBundle] = useState<FamilySupportBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissTick, setDismissTick] = useState(0)

  const load = useCallback(() => {
    setLoading(true)
    api.familySupport.insights(patientId, { medicationName, healthThreadId })
      .then(setBundle)
      .catch(() => setBundle(null))
      .finally(() => setLoading(false))
  }, [patientId, medicationName, healthThreadId])

  useEffect(() => { load() }, [load])

  const visibleInsights = useMemo(() => {
    if (!bundle) return []
    return bundle.insights.filter(
      (i) => !isHintDismissed(familySupportHintId(patientId, { insightId: i.id })),
    )
  }, [bundle, patientId, dismissTick])

  const showDisclaimer = !isHintDismissed(familySupportHintId(patientId, 'disclaimer'))
  const showNoInsights = !compact
    && visibleInsights.length === 0
    && !isHintDismissed(familySupportHintId(patientId, 'no-insights'))

  const showEmergencyLink = visibleInsights.some(
    (i) => i.priority === 'critical' || i.action === 'do_not_apply' || i.action === 'seek_medical_care',
  )

  const hasContent = showDisclaimer || showNoInsights || visibleInsights.length > 0 || showEmergencyLink

  if (loading && !bundle) return null
  if (!bundle || !hasContent) return null

  const onDismissed = () => setDismissTick((n) => n + 1)

  return (
    <Card
      size="small"
      style={{ marginBottom: 16, borderRadius: 12 }}
      title={t('familySupport.title')}
      styles={{ body: { paddingTop: hasContent ? 12 : 8 } }}
    >
      {showDisclaimer && (
        <DismissibleHint
          hintId={familySupportHintId(patientId, 'disclaimer')}
          type="info"
          showIcon
          acknowledge={false}
          message={bundle.disclaimer}
          style={{ marginBottom: visibleInsights.length > 0 || showEmergencyLink || showNoInsights ? 12 : 0 }}
          onClose={onDismissed}
        />
      )}
      {showEmergencyLink && (
        <Link to={`/emergency?patientId=${patientId}`} style={{ marginBottom: 12, display: 'inline-block' }}>
          <Button type="primary" danger icon={<PhoneOutlined />} size="small">
            {t('familySupport.openEmergency')}
          </Button>
        </Link>
      )}
      {visibleInsights.length > 0 && (
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          {visibleInsights.map((item) => (
            <DismissibleHint
              key={item.id}
              hintId={familySupportHintId(patientId, { insightId: item.id })}
              type={insightAlertType(item.priority)}
              showIcon
              icon={KIND_ICON[item.kind]}
              acknowledge={false}
              onClose={onDismissed}
              message={
                <Space wrap>
                  <Typography.Text strong>{item.title}</Typography.Text>
                  <Tag color={PRIORITY_COLOR[item.priority]}>{t(`familySupport.priority.${item.priority}`)}</Tag>
                </Space>
              }
              description={
                <>
                  <Typography.Paragraph style={{ marginBottom: 0 }}>{item.message}</Typography.Paragraph>
                  {!compact && item.citations.length > 0 && (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {t('familySupport.sources')}: {item.citations.map((c) => c.label).join(' · ')}
                    </Typography.Text>
                  )}
                </>
              }
            />
          ))}
        </Space>
      )}
      {showNoInsights && (
        <DismissibleHint
          hintId={familySupportHintId(patientId, 'no-insights')}
          type="info"
          acknowledge={false}
          onClose={onDismissed}
          message={t('familySupport.noInsights')}
          style={{ marginTop: visibleInsights.length > 0 ? 8 : 0 }}
        />
      )}
    </Card>
  )
}
