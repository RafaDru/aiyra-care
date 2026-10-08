import { useEffect } from 'react'
import { Segmented, Space, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { CareCirclesPanel } from './CareCirclesPanel.js'
import { FamilyGlossaryCard } from './FamilyGlossaryCard.js'
import { FamilyInviteCard } from './FamilyInviteCard.js'
import { ProfileShareCard } from './ProfileShareCard.js'
import { useActiveCareCircle } from '../../contexts/ActiveCareCircleContext.js'

/** Conteúdo compartilhado do hub «Sua família». */
export function FamilyHubContent() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { hasMultipleCircles, circles, activeCircleId, setActiveCircleId } = useActiveCareCircle()

  const circleFromUrl = searchParams.get('circle')

  useEffect(() => {
    if (!circleFromUrl || circles.length === 0) return
    if (!circles.some((c) => c.id === circleFromUrl)) return
    setActiveCircleId(circleFromUrl)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('circle')
        return next
      },
      { replace: true },
    )
  }, [circleFromUrl, circles, setActiveCircleId, setSearchParams])

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {hasMultipleCircles && (
        <div>
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            {t('family.hub.activeCircleLabel')}
          </Typography.Text>
          <Segmented
            data-testid="care-circle-hub-segmented"
            options={circles.map((c) => ({ label: c.name, value: c.id }))}
            value={activeCircleId}
            onChange={(value) => setActiveCircleId(String(value))}
          />
        </div>
      )}
      <FamilyGlossaryCard />
      <CareCirclesPanel />
      <ProfileShareCard />
      <FamilyInviteCard />
    </Space>
  )
}
