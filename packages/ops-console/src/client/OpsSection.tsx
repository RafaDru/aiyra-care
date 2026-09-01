import { Typography } from 'antd'
import type { ReactNode } from 'react'

const { Title, Paragraph } = Typography

export function OpsSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <Title level={4} style={{ marginBottom: 4 }}>{title}</Title>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>{description}</Paragraph>
      </div>
      {children}
    </section>
  )
}
