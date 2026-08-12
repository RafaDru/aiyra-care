import { Typography } from 'antd'
import { LinkOutlined } from '@ant-design/icons'
import { AIYRACARE_TOKENS } from '../../theme/aiyracare-tokens.js'

const { Text } = Typography

interface ClinicalSequenceSectionHeaderProps {
  title: string
  icon?: boolean
}

export function ClinicalSequenceSectionHeader({ title, icon = true }: ClinicalSequenceSectionHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
      {icon && <LinkOutlined style={{ color: AIYRACARE_TOKENS.colorPrimary }} />}
      <Text strong style={{ fontSize: 13 }}>{title}</Text>
    </div>
  )
}
