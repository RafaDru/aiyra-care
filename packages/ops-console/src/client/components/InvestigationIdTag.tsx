import { Button, Space, Tooltip, Typography, message } from 'antd'
import { CopyOutlined } from '@ant-design/icons'

const { Text } = Typography

export function InvestigationIdTag({
  investigationId,
  showFull = false,
  compact = false,
}: {
  investigationId: string | null | undefined
  showFull?: boolean
  /** Tabela Incidentes: só prefixo + tooltip, sem botão copiar. */
  compact?: boolean
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

  if (compact) {
    return (
      <Tooltip title={investigationId}>
        <Text code style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{short}…</Text>
      </Tooltip>
    )
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
