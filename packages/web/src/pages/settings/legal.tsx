import { Space } from 'antd'
import { LegalContactCard } from '../../components/legal/LegalContactCard.js'
import { LegalGoLiveCard } from '../../components/legal/LegalGoLiveCard.js'
import { SettingsComplianceCard } from '../../components/settings/SettingsComplianceCard.js'

export function SettingsLegalPage() {
  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <SettingsComplianceCard />
      <LegalGoLiveCard />
      <LegalContactCard />
    </Space>
  )
}
