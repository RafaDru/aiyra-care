import type { ReactNode } from 'react'
import { Card, type CardProps } from 'antd'
import { AI_INSIGHT_STYLE } from '../../theme/aiyracare-tokens.js'

type AiInsightCardProps = CardProps & {
  children: ReactNode
}

/**
 * Card para conteúdo processado por IA — borda amarela e sombra suave (AiyraCare).
 */
export function AiInsightCard({ children, style, styles, ...rest }: AiInsightCardProps) {
  return (
    <Card
      {...rest}
      style={{
        borderColor: AI_INSIGHT_STYLE.borderColor,
        boxShadow: AI_INSIGHT_STYLE.boxShadow,
        ...style,
      }}
      styles={{
        body: { padding: 20 },
        ...styles,
      }}
    >
      {children}
    </Card>
  )
}
