import type { CSSProperties, ReactNode } from 'react'
import './clinical-indent-panel.css'

interface ClinicalIndentPanelProps {
  children: ReactNode
  /** Borda de destaque (cor do tipo de entidade). */
  accentColor?: string
  style?: CSSProperties
  className?: string
}

/**
 * Conteúdo indentado abaixo de uma linha expandida (pedido, autorização, etc.).
 */
export function ClinicalIndentPanel({
  children,
  accentColor = 'var(--ant-color-primary, #9333ea)',
  style,
  className,
}: ClinicalIndentPanelProps) {
  return (
    <div
      className={['clinical-indent-panel', className].filter(Boolean).join(' ')}
      style={{ '--clinical-indent-accent': accentColor, ...style } as CSSProperties}
    >
      {children}
    </div>
  )
}
