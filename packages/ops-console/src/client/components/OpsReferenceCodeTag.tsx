import type { CSSProperties, MouseEvent } from 'react'
import { Button, Space, Tooltip, Typography, message } from 'antd'
import { CopyOutlined } from '@ant-design/icons'
import { inferOpsReferenceHref } from '../ch-ops-deep-link.js'

const { Text } = Typography

export function OpsReferenceCodeTag({
  code,
  compact = false,
  href: hrefOverride,
  navigateOnClick = true,
  showCopy = undefined,
}: {
  code: string | null | undefined
  compact?: boolean
  /** Sobrescreve inferência INC-* / DEF-* (ex.: link por UUID). */
  href?: string | null
  navigateOnClick?: boolean
  /** Default: copiar no detalhe; célula compacta só navega. */
  showCopy?: boolean
}) {
  if (!code) {
    return <Text type="secondary">—</Text>
  }

  const href =
    navigateOnClick && (hrefOverride ?? inferOpsReferenceHref(code))
      ? hrefOverride ?? inferOpsReferenceHref(code)
      : null
  const copyVisible = showCopy ?? !compact

  const copy = async (e: MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    try {
      await navigator.clipboard.writeText(code)
      message.success('Referência copiada')
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
      {code}
    </a>
  ) : (
    <Text code style={codeStyle}>
      {code}
    </Text>
  )

  if (compact) {
    return (
      <Tooltip title={href ? `${code} — clique para abrir no CH` : code}>{labelNode}</Tooltip>
    )
  }

  return (
    <Space size={4} wrap>
      <Tooltip title={href ? 'Abrir no CH' : code}>{labelNode}</Tooltip>
      {copyVisible && (
        <Button
          type="text"
          size="small"
          icon={<CopyOutlined />}
          aria-label="Copiar referência"
          onClick={copy}
        />
      )}
    </Space>
  )
}
