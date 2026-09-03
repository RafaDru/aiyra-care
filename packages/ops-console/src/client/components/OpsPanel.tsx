import type { ReactNode } from 'react'
import { Card, Typography } from 'antd'

const { Text } = Typography

export function OpsPanel({
  title,
  description,
  children,
  extra,
}: {
  title: string
  description?: string
  children: ReactNode
  extra?: ReactNode
}) {
  return (
    <Card
      size="small"
      title={
        <div>
          <Text strong>{title}</Text>
          {description && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>{description}</Text>
            </div>
          )}
        </div>
      }
      extra={extra}
      styles={{ body: { paddingTop: description ? 12 : 16 } }}
    >
      {children}
    </Card>
  )
}
