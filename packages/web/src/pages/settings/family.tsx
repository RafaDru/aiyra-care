import { Space } from 'antd'
import { CareCirclesPanel } from '../../components/family/CareCirclesPanel.js'
import { FamilyInviteCard } from '../../components/family/FamilyInviteCard.js'
import { ProfileShareCard } from '../../components/family/ProfileShareCard.js'

export function SettingsFamilyPage() {
  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <CareCirclesPanel />
      <ProfileShareCard />
      <FamilyInviteCard />
    </Space>
  )
}
