import { Button } from 'antd'
import { DownOutlined, UpOutlined } from '@ant-design/icons'

interface ClinicalRowExpandToggleProps {
  expanded: boolean
  onToggle: () => void
  label?: string
  /** aria-label quando não há label visível */
  ariaLabel?: string
}

/**
 * Botão padrão para expandir linha (pedido, sequência clínica, etc.).
 */
export function ClinicalRowExpandToggle({
  expanded,
  onToggle,
  label,
  ariaLabel,
}: ClinicalRowExpandToggleProps) {
  return (
    <Button
      type="text"
      size="small"
      icon={expanded ? <UpOutlined /> : <DownOutlined />}
      onClick={onToggle}
      aria-expanded={expanded}
      aria-label={ariaLabel ?? label}
      style={{ padding: 0, minWidth: 24, height: 24 }}
    >
      {label}
    </Button>
  )
}
