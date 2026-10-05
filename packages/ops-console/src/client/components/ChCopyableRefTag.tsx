import type { MouseEvent } from 'react'
import { Button, Tag, Tooltip, message } from 'antd'
import { CopyOutlined } from '@ant-design/icons'

export function ChCopyableRefTag({
  code,
  href,
  compact = false,
}: {
  code: string
  href?: string | null
  compact?: boolean
}) {
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

  const label = href ? (
    <a
      href={href}
      data-ch-no-row-toggle
      onClick={(e) => e.stopPropagation()}
      style={{ color: 'inherit', fontFamily: 'monospace', fontSize: compact ? 11 : 12 }}
    >
      {code}
    </a>
  ) : (
    <span style={{ fontFamily: 'monospace', fontSize: compact ? 11 : 12 }}>{code}</span>
  )

  return (
    <span data-ch-no-row-toggle style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      <Tag style={{ margin: 0 }}>{label}</Tag>
      <Tooltip title="Copiar referência">
        <Button
          type="text"
          size="small"
          icon={<CopyOutlined />}
          aria-label="Copiar referência"
          data-ch-no-row-toggle
          onClick={copy}
        />
      </Tooltip>
    </span>
  )
}
