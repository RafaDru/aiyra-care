import { Space } from 'antd'
import { CareCirclesPanel } from './CareCirclesPanel.js'
import { FamilyInviteCard } from './FamilyInviteCard.js'
import { ProfileShareCard } from './ProfileShareCard.js'

/** Conteúdo compartilhado do hub «Sua família». */
export function FamilyHubContent() {
  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <CareCirclesPanel />
      <ProfileShareCard />
      <FamilyInviteCard />
    </Space>
  )
}
