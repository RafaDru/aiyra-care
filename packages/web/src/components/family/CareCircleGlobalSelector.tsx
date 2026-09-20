import { Select, Space } from 'antd'
import { TeamOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useActiveCareCircle } from '../../contexts/ActiveCareCircleContext.js'

/** Seletor global de família (círculo de cuidado) — visível com 2+ círculos. */
export function CareCircleGlobalSelector() {
  const { t } = useTranslation()
  const { circles, activeCircleId, setActiveCircleId, hasMultipleCircles, loading } = useActiveCareCircle()

  if (!hasMultipleCircles) return null

  return (
    <Space size={8} align="center">
      <TeamOutlined aria-hidden style={{ color: 'var(--text-secondary)' }} />
      <Select
        data-testid="care-circle-global-selector"
        aria-label={t('family.hub.selectorAria')}
        loading={loading}
        value={activeCircleId}
        onChange={setActiveCircleId}
        style={{ minWidth: 200, maxWidth: 280 }}
        options={circles.map((c) => ({ value: c.id, label: c.name }))}
        popupMatchSelectWidth={false}
      />
    </Space>
  )
}
