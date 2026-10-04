import type { CSSProperties, MouseEvent } from 'react'
import { Button, Space, Tooltip, Typography, message } from 'antd'
import { CopyOutlined } from '@ant-design/icons'
import { buildInvestigationDeepLink } from '../ch-ops-deep-link.js'

const { Text } = Typography

export function InvestigationIdTag({
  investigationId,
  showFull = false,
  compact = false,
  /** Clique no rótulo abre Incidentes com highlight (padrão CH). */
  navigateOnClick = true,
  showCopy = undefined,
}: {
  investigationId: string | null | undefined
  showFull?: boolean
  /** Tabela: prefixo curto; clique navega. */
  compact?: boolean
  navigateOnClick?: boolean
  /** Default: copiar só no detalhe (showFull), não na célula compacta. */
  showCopy?: boolean
}) {
  if (!investigationId) {
    return <Text type="secondary">—</Text>
  }

  const short = investigationId.slice(0, 8)
  const label = showFull ? investigationId : `${short}…`
  const href = navigateOnClick ? buildInvestigationDeepLink(investigationId) : null
  const copyVisible = showCopy ?? showFull

  const copy = async (e: MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    try {
      await navigator.clipboard.writeText(investigationId)
      message.success('Identificador copiado')
    } catch {
      message.error('Não foi possível copiar')
    }
  }

  const codeStyle: CSSProperties = {
    fontSize: 11,
    whiteSpace: 'nowrap',
    cursor: href ? 'pointer' : undefined,
  }

  const labelNode = href ? (
    <a
      href={href}
      onClick={(e) => e.stopPropagation()}
      style={{ color: 'inherit', fontFamily: 'monospace', fontSize: codeStyle.fontSize }}
    >
      {label}
    </a>
  ) : (
    <Text code style={codeStyle} title={investigationId}>
      {label}
    </Text>
  )

  if (compact) {
    return (
      <Tooltip title={`${investigationId} — clique para abrir no CH`}>
        {labelNode}
      </Tooltip>
    )
  }

  return (
    <Space size={4} wrap>
      <Tooltip title={href ? 'Abrir incidente no CH' : investigationId}>{labelNode}</Tooltip>
      {copyVisible && (
        <Button
          type="text"
          size="small"
          icon={<CopyOutlined />}
          aria-label="Copiar identificador"
          onClick={copy}
        />
      )}
    </Space>
  )
}
