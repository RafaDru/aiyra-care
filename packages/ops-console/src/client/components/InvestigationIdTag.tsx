import { Button, Space, Typography, message } from 'antd'
import { CopyOutlined } from '@ant-design/icons'

const { Text } = Typography

export function InvestigationIdTag({
  investigationId,
  showFull = false,
}: {
  investigationId: string | null | undefined
  showFull?: boolean
}) {
  if (!investigationId) {
    return <Text type="secondary">—</Text>
  }

  const short = investigationId.slice(0, 8)
  const label = showFull ? investigationId : short

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(investigationId)
      message.success('investigationId copiado')
    } catch {
      message.error('Não foi possível copiar')
    }
  }

  return (
    <Space size={4}>
      <Text code title={investigationId}>{label}</Text>
      <Button
        type="text"
        size="small"
        icon={<CopyOutlined />}
        aria-label="Copiar investigationId"
        onClick={(e) => {
          e.stopPropagation()
          void copy()
        }}
      />
    </Space>
  )
}
