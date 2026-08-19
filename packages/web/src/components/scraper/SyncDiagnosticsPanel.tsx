import { useMemo, useState } from 'react'
import { Alert, Button, Typography } from 'antd'
import { useTranslation } from 'react-i18next'

const { Text } = Typography

const COLLAPSE_CHAR_LIMIT = 280
const COLLAPSE_LINE_LIMIT = 4

function normalizeLines(items: string[]): string[] {
  const flat: string[] = []
  for (const item of items) {
    const trimmed = item.trim()
    if (!trimmed) continue
    flat.push(...trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean))
  }
  return flat
}

interface Props {
  variant: 'error' | 'warning' | 'info'
  title: string
  items: string[]
  /** Altura máxima do corpo quando recolhido (px). */
  collapsedMaxHeight?: number
  className?: string
}

/**
 * Lista de mensagens de sync (erros, avisos) com recolher/expandir e copiar.
 */
export function SyncDiagnosticsPanel({
  variant,
  title,
  items,
  collapsedMaxHeight = 88,
  className,
}: Props) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const lines = useMemo(() => normalizeLines(items), [items])

  if (!lines.length) return null

  const fullText = lines.join('\n')
  const needsCollapse = fullText.length > COLLAPSE_CHAR_LIMIT || lines.length > COLLAPSE_LINE_LIMIT

  const copy = () => void navigator.clipboard.writeText(fullText)

  return (
    <Alert
      type={variant}
      showIcon
      className={['sync-diagnostics', className].filter(Boolean).join(' ')}
      style={{ marginTop: 8, textAlign: 'left' }}
      message={title}
      description={
        <div className="sync-diagnostics__body-wrap">
          <div
            className="sync-diagnostics__body"
            style={{
              maxHeight: expanded || !needsCollapse ? 'none' : collapsedMaxHeight,
              overflow: expanded || !needsCollapse ? 'visible' : 'hidden',
            }}
          >
            <ul className="sync-diagnostics__list">
              {lines.map((line) => (
                <li key={line}>
                  <Text className="sync-diagnostics__line">{line}</Text>
                </li>
              ))}
            </ul>
          </div>
          <div className="sync-diagnostics__actions">
            {needsCollapse && (
              <Button type="link" size="small" onClick={() => setExpanded((v) => !v)}>
                {expanded ? t('sync.diagnostics.collapse') : t('sync.diagnostics.expand')}
              </Button>
            )}
            <Button type="link" size="small" onClick={copy}>
              {t('sync.diagnostics.copy')}
            </Button>
          </div>
        </div>
      }
    />
  )
}

/** Mensagem única longa (stack trace) — mesmo layout colapsável. */
export function SyncDiagnosticMessage({
  variant,
  title,
  message,
  collapsedMaxHeight = 88,
}: {
  variant: 'error' | 'warning' | 'info'
  title?: string
  message: string
  collapsedMaxHeight?: number
}) {
  if (!message.trim()) return null
  return (
    <SyncDiagnosticsPanel
      variant={variant}
      title={title ?? (variant === 'error' ? 'Erro' : 'Detalhes')}
      items={[message]}
      collapsedMaxHeight={collapsedMaxHeight}
    />
  )
}
