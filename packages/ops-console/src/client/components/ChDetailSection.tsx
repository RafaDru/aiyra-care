import type { ReactNode } from 'react'
import { Typography } from 'antd'

const { Text } = Typography

export function ChDetailSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section
      style={{
        marginBottom: 12,
        paddingBottom: 12,
        borderBottom: '1px solid var(--ops-border, #e2e8f0)',
      }}
    >
      <Text strong style={{ display: 'block', marginBottom: 8 }}>{title}</Text>
      {children}
    </section>
  )
}
