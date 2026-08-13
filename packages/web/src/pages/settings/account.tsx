import { Space } from 'antd'
import { AccountProfileCard } from '../../components/account/AccountProfileCard.js'
import { DeleteAccountCard } from '../../components/account/DeleteAccountCard.js'

export function SettingsAccountPage() {
  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <AccountProfileCard />
      <DeleteAccountCard />
    </Space>
  )
}
