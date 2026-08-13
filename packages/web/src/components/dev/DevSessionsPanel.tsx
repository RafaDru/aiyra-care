import { useEffect, useState } from 'react'
import { Card, Spin, Empty, Tag, Typography, Collapse, Checkbox, App } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, HistoryOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api.js'
import type { Session } from '../../lib/api.types.js'

const { Text } = Typography

export function DevSessionsPanel() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.sessions
      .list()
      .then(setSessions)
      .catch((err) => message.error(err instanceof Error ? err.message : t('session.loadError')))
      .finally(() => setLoading(false))
  }, [message, t])

  if (loading) return <Spin style={{ display: 'block', margin: '24px auto' }} />

  if (sessions.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('common.empty')} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {sessions.map((s) => (
        <Card
          key={s.date + s.title}
          size="small"
          style={{ borderRadius: 12 }}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <HistoryOutlined />
              <Text strong>{s.title}</Text>
              <Tag color="blue">{s.date}</Tag>
            </div>
          }
        >
          {s.description && (
            <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>{s.description}</Text>
          )}

          <Collapse
            ghost
            size="small"
            defaultActiveKey={s.sections.length === 1 ? ['0'] : undefined}
            items={s.sections.map((sec, idx) => ({
              key: String(idx),
              label: (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {sec.items.length > 0 && (
                    sec.items.every((i) => i.done)
                      ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      : <CloseCircleOutlined style={{ color: '#faad14' }} />
                  )}
                  <Text strong>{sec.heading}</Text>
                  <Tag>{sec.items.filter((i) => i.done).length}/{sec.items.length}</Tag>
                </div>
              ),
              children: sec.items.length === 0 ? (
                <Text type="secondary" italic>{t('session.noItems')}</Text>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {sec.items.map((item, i) => (
                    <Checkbox key={i} checked={item.done} disabled style={{ marginLeft: 8 }}>
                      <Text
                        style={{
                          textDecoration: item.done ? 'line-through' : 'none',
                          color: item.done ? 'var(--text-secondary)' : undefined,
                        }}
                      >
                        {item.text}
                      </Text>
                    </Checkbox>
                  ))}
                </div>
              ),
            }))}
          />
        </Card>
      ))}
    </div>
  )
}
