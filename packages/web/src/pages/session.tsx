import { useEffect, useState } from 'react'
import { Card, Spin, Empty, Tag, Typography, Collapse, Timeline, Checkbox, App } from 'antd'
import { HistoryOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api.js'
import { PageHeader } from '../components/ui/PageHeader.js'

const { Text } = Typography

export interface SessionItem {
  text: string
  done: boolean
}

export interface SessionSection {
  heading: string
  items: SessionItem[]
}

export interface Session {
  date: string
  title: string
  description?: string
  sections: SessionSection[]
}

export function SessionPage() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.sessions.list()
      .then(setSessions)
      .catch((err) => message.error(err instanceof Error ? err.message : 'Erro ao carregar sessões'))
      .finally(() => setLoading(false))
  }, [message])

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />

  if (sessions.length === 0) {
    return (
      <div>
        <PageHeader title={t('session.title')} />
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('common.empty')} style={{ marginTop: 80 }} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={t('session.title')} subtitle={t('session.subtitle')} />

      <Timeline
        items={sessions.map((s) => ({
          color: 'var(--primary)',
          children: (
            <Card
              key={s.date + s.title}
              size="small"
              style={{ marginBottom: 16, borderRadius: 12 }}
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
                        sec.items.every(i => i.done)
                          ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
                          : <CloseCircleOutlined style={{ color: '#faad14' }} />
                      )}
                      <Text strong>{sec.heading}</Text>
                      <Tag>{sec.items.filter(i => i.done).length}/{sec.items.length}</Tag>
                    </div>
                  ),
                  children: sec.items.length === 0 ? (
                    <Text type="secondary" italic>{t('session.noItems')}</Text>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {sec.items.map((item, i) => (
                        <Checkbox key={i} checked={item.done} disabled style={{ marginLeft: 8 }}>
                          <Text style={{ textDecoration: item.done ? 'line-through' : 'none', color: item.done ? 'var(--text-secondary)' : undefined }}>
                            {item.text}
                          </Text>
                        </Checkbox>
                      ))}
                    </div>
                  ),
                }))}
              />
            </Card>
          ),
        }))}
      />
    </div>
  )
}
