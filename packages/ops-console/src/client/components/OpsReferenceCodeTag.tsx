import { Button, Space, Tooltip, Typography, message } from 'antd'
import { CopyOutlined } from '@ant-design/icons'

const { Text } = Typography

export function OpsReferenceCodeTag({
  code,
  compact = false,
}: {
  code: string | null | undefined
  compact?: boolean
}) {
  if (!code) {
    return <Text type="secondary">—</Text>
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      message.success('Referência copiada')
    } catch {
      message.error('Não foi possível copiar')
    }
  }

  if (compact) {
    return (
      <Tooltip title={code}>
        <Text code style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{code}</Text>
      </Tooltip>
    )
  }

  return (
    <Space size={4}>
      <Text code>{code}</Text>
      <Button
        type="text"
        size="small"
        icon={<CopyOutlined />}
        aria-label="Copiar referência"
        onClick={(e) => {
          e.stopPropagation()
          void copy()
        }}
      />
    </Space>
  )
}
