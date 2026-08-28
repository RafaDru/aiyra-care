import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, Col, Row, Space, Typography } from 'antd'
import {
  CalendarOutlined,
  CloudSyncOutlined,
  FileProtectOutlined,
  MedicineBoxOutlined,
  RobotOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { AppLogo } from '../components/brand/AppLogo.js'
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher.js'
import { ThemeSwitcher } from '../components/ui/ThemeSwitcher.js'
import { trackLandingEvent } from '../lib/landing-events.js'
import './landing.css'

const { Title, Paragraph, Text } = Typography

const FEATURE_ICONS = [
  CloudSyncOutlined,
  FileProtectOutlined,
  RobotOutlined,
  CalendarOutlined,
  MedicineBoxOutlined,
  TeamOutlined,
] as const

export function LandingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  useEffect(() => {
    trackLandingEvent('landing_page_view', { section: 'home' })
  }, [])

  const trackCta = (cta_target: string, section?: string) => {
    trackLandingEvent('landing_cta_click', { cta_target, section })
  }

  const goLogin = (mode: 'login' | 'signup', section: string) => {
    trackCta(mode, section)
    navigate('/login')
  }

  const problems = t('landing.problems.items', { returnObjects: true }) as string[]
  const steps = t('landing.howItWorks.steps', { returnObjects: true }) as string[]
  const features = t('landing.features.items', { returnObjects: true }) as Array<{ title: string; body: string }>
  const plans = t('landing.pricing.plans', { returnObjects: true }) as Array<{
    name: string
    price: string
    period?: string
    description: string
    highlight?: boolean
  }>

  return (
    <div className="landing-page">
      <header className="landing-header">
        <AppLogo variant="sidebar" height={36} style={{ maxWidth: 200 }} />
        <Space>
          <ThemeSwitcher />
          <LanguageSwitcher />
          <Button type="link" onClick={() => goLogin('login', 'header')}>
            {t('landing.ctaLogin')}
          </Button>
          <Button type="primary" onClick={() => goLogin('signup', 'header')}>
            {t('landing.ctaSignup')}
          </Button>
        </Space>
      </header>

      <section className="landing-section landing-hero">
        <Title level={1} className="landing-hero-title">{t('landing.heroTitle')}</Title>
        <Paragraph className="landing-hero-subtitle" type="secondary">
          {t('landing.heroSubtitle')}
        </Paragraph>
        <Space size="middle" wrap>
          <Button type="primary" size="large" onClick={() => goLogin('signup', 'hero')}>
            {t('landing.ctaSignup')}
          </Button>
          <Button size="large" onClick={() => goLogin('login', 'hero')}>
            {t('landing.ctaLogin')}
          </Button>
        </Space>
        <Text type="secondary" className="landing-hero-note">{t('landing.heroNote')}</Text>
      </section>

      <section className="landing-section">
        <Title level={2}>{t('landing.problems.title')}</Title>
        <Row gutter={[16, 16]}>
          {problems.map((item, i) => (
            <Col key={i} xs={24} md={8}>
              <Card size="small" className="landing-card">
                <Paragraph>{item}</Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      <section className="landing-section">
        <Title level={2}>{t('landing.howItWorks.title')}</Title>
        <ol className="landing-steps">
          {steps.map((step, i) => (
            <li key={i}><Text>{step}</Text></li>
          ))}
        </ol>
      </section>

      <section className="landing-section">
        <Title level={2}>{t('landing.features.title')}</Title>
        <Row gutter={[16, 16]}>
          {features.map((f, i) => {
            const Icon = FEATURE_ICONS[i] ?? CloudSyncOutlined
            return (
              <Col key={f.title} xs={24} sm={12} md={8}>
                <Card size="small" className="landing-card">
                  <Space direction="vertical" size={8}>
                    <Icon style={{ fontSize: 22, color: 'var(--brand-primary, #0D9488)' }} />
                    <Text strong>{f.title}</Text>
                    <Text type="secondary">{f.body}</Text>
                  </Space>
                </Card>
              </Col>
            )
          })}
        </Row>
      </section>

      <section className="landing-section landing-pricing" id="pricing">
        <Title level={2}>{t('landing.pricing.title')}</Title>
        <Paragraph type="secondary">{t('landing.pricing.subtitle')}</Paragraph>
        <Row gutter={[16, 16]}>
          {plans.map((plan) => (
            <Col key={plan.name} xs={24} md={8}>
              <Card
                className={plan.highlight ? 'landing-card landing-plan-highlight' : 'landing-card'}
                title={plan.name}
              >
                <Title level={3} style={{ marginTop: 0 }}>
                  {plan.price}
                  {plan.period && <Text type="secondary" style={{ fontSize: 14 }}> {plan.period}</Text>}
                </Title>
                <Paragraph type="secondary">{plan.description}</Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
        <Paragraph type="secondary" style={{ marginTop: 16 }}>
          {t('landing.pricing.disclaimer')}
        </Paragraph>
        <Button type="primary" onClick={() => goLogin('signup', 'pricing')}>
          {t('landing.ctaSignup')}
        </Button>
      </section>

      <section className="landing-section landing-cta-final">
        <Title level={3}>{t('landing.finalCta.title')}</Title>
        <Paragraph type="secondary">{t('landing.finalCta.body')}</Paragraph>
        <Button type="primary" size="large" onClick={() => goLogin('signup', 'footer')}>
          {t('landing.ctaSignup')}
        </Button>
      </section>

      <footer className="landing-footer">
        <Space split={<span>·</span>} wrap size="small">
          <Link to="/termos" onClick={() => trackCta('terms', 'footer')}>{t('legal.termsLink')}</Link>
          <Link to="/privacidade" onClick={() => trackCta('privacy', 'footer')}>{t('legal.privacyLink')}</Link>
          <Link to="/cookies" onClick={() => trackCta('cookies', 'footer')}>{t('legal.cookiePolicyLink')}</Link>
          <Link to="/login" onClick={() => trackCta('login', 'footer')}>{t('landing.ctaLogin')}</Link>
        </Space>
        <Text type="secondary" style={{ fontSize: 12, marginTop: 12, display: 'block' }}>
          {t('landing.footerNote')}
        </Text>
      </footer>
    </div>
  )
}
