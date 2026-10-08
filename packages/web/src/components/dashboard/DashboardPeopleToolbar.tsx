import { Segmented, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import type { DashboardGroupMode } from '../../lib/dashboard/group-patients-for-dashboard.js'

const { Text } = Typography

interface DashboardPeopleToolbarProps {
  mode: DashboardGroupMode
  onModeChange: (mode: DashboardGroupMode) => void
  visible: boolean
}

export function DashboardPeopleToolbar({ mode, onModeChange, visible }: DashboardPeopleToolbarProps) {
  const { t } = useTranslation()

  if (!visible) return null

  return (
    <div
      style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 24 }}
      data-testid="dashboard-group-mode-toolbar"
    >
      <Text type="secondary">{t('dashboard.groupByLabel')}</Text>
      <Segmented
        value={mode}
        onChange={(value) => onModeChange(value as DashboardGroupMode)}
        options={[
          { label: t('dashboard.groupMode.family'), value: 'family' },
          { label: t('dashboard.groupMode.age'), value: 'age' },
          { label: t('dashboard.groupMode.alpha'), value: 'alpha' },
        ]}
      />
    </div>
  )
}
