import type { ReactNode } from 'react'
import { Avatar, Tag, Typography } from 'antd'
import { useTranslation } from 'react-i18next'

const { Text } = Typography

export function MockBrowserFrame({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="landing-mock-browser">
      <div className="landing-mock-browser-bar">
        <span className="landing-mock-dot" />
        <span className="landing-mock-dot" />
        <span className="landing-mock-dot" />
        <Text type="secondary" className="landing-mock-browser-title">{title}</Text>
      </div>
      <div className="landing-mock-browser-body">{children}</div>
    </div>
  )
}

export function MockDashboardPreview() {
  const { t } = useTranslation()
  const patients = t('landing.mocks.patients', { returnObjects: true }) as Array<{ name: string; age: string }>
  return (
    <MockBrowserFrame title={t('landing.mocks.dashboardTitle')}>
      <div className="landing-mock-dashboard">
        {patients.map((p) => (
          <div key={p.name} className="landing-mock-patient-card">
            <Avatar size={40} style={{ background: 'var(--brand-primary, #0d9488)' }}>{p.name[0]}</Avatar>
            <div>
              <Text strong>{p.name}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>{p.age}</Text>
            </div>
            <Tag color="green">{t('landing.mocks.syncOk')}</Tag>
          </div>
        ))}
      </div>
    </MockBrowserFrame>
  )
}

export function MockAvaChatPreview() {
  const { t } = useTranslation()
  const lines = t('landing.mocks.avaLines', { returnObjects: true }) as string[]
  return (
    <MockBrowserFrame title={t('landing.mocks.avaTitle')}>
      <div className="landing-mock-ava">
        <img src="/brand/ava-avatar-caregiver-v2.png" alt="" className="landing-mock-ava-avatar" />
        <div className="landing-mock-chat">
          {lines.map((line, i) => (
            <div
              key={i}
              className={i % 2 === 0 ? 'landing-mock-bubble landing-mock-bubble-user' : 'landing-mock-bubble landing-mock-bubble-ava'}
            >
              {line}
            </div>
          ))}
        </div>
      </div>
    </MockBrowserFrame>
  )
}

export function MockTimelinePreview() {
  const { t } = useTranslation()
  const items = t('landing.mocks.timelineItems', { returnObjects: true }) as Array<{ date: string; label: string }>
  return (
    <MockBrowserFrame title={t('landing.mocks.timelineTitle')}>
      <ul className="landing-mock-timeline">
        {items.map((item) => (
          <li key={item.label}>
            <Text type="secondary" style={{ fontSize: 11 }}>{item.date}</Text>
            <Text>{item.label}</Text>
          </li>
        ))}
      </ul>
    </MockBrowserFrame>
  )
}

export function MockGrowthChartPreview() {
  const { t } = useTranslation()
  return (
    <MockBrowserFrame title={t('landing.mocks.chartTitle')}>
      <div className="landing-mock-chart-wrap">
        <svg viewBox="0 0 280 120" className="landing-mock-chart" aria-hidden>
          <polyline
            fill="none"
            stroke="var(--brand-primary, #0d9488)"
            strokeWidth="3"
            points="10,90 50,75 90,80 130,55 170,48 210,40 250,35"
          />
          <line x1="10" y1="100" x2="270" y2="100" stroke="var(--border)" strokeWidth="1" />
        </svg>
        <Text type="secondary" style={{ fontSize: 12 }}>{t('landing.mocks.chartCaption')}</Text>
      </div>
    </MockBrowserFrame>
  )
}

export function MockExportPreview() {
  const { t } = useTranslation()
  const bullets = t('landing.mocks.exportBullets', { returnObjects: true }) as string[]
  return (
    <MockBrowserFrame title={t('landing.mocks.exportTitle')}>
      <div className="landing-mock-export">
        <Text strong>{t('landing.mocks.exportHeading')}</Text>
        <ul>
          {bullets.map((b) => <li key={b}><Text type="secondary">{b}</Text></li>)}
        </ul>
        <Tag color="blue">{t('landing.mocks.exportTag')}</Tag>
      </div>
    </MockBrowserFrame>
  )
}
