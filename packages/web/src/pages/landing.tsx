import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, Col, Row, Space, Typography } from 'antd'
import {
  CalendarOutlined,
  CloudSyncOutlined,
  FileProtectOutlined,
  LineChartOutlined,
  RobotOutlined,
  SafetyOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { AppLogo } from '../components/brand/AppLogo.js'
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher.js'
import { ThemeSwitcher } from '../components/ui/ThemeSwitcher.js'
import {
  MockAvaChatPreview,
  MockDashboardPreview,
  MockExportPreview,
  MockGrowthChartPreview,
  MockTimelinePreview,
} from '../components/landing/LandingProductMocks.js'
import { LandingScreenshot, LandingScreenshotFrame } from '../components/landing/LandingScreenshot.js'
import { LandingShowcaseSection } from '../components/landing/LandingShowcaseSection.js'
import { LANDING_PHOTOS, LANDING_SCREENSHOTS } from '../lib/landing-media.js'
import { trackLandingEvent } from '../lib/landing-events.js'
import './landing.css'

const { Title, Paragraph, Text } = Typography

const FEATURE_ICONS = [
  CloudSyncOutlined,
  FileProtectOutlined,
  RobotOutlined,
  CalendarOutlined,
  LineChartOutlined,
  SafetyOutlined,
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

  const pains = t('landing.pains.items', { returnObjects: true }) as Array<{ title: string; body: string }>
  const useCases = t('landing.useCases.steps', { returnObjects: true }) as Array<{ title: string; body: string }>
  const features = t('landing.features.items', { returnObjects: true }) as Array<{ title: string; body: string }>
  const plans = t('landing.pricing.plans', { returnObjects: true }) as Array<{
    name: string
    price: string
    period?: string
    description: string
    highlight?: boolean
  }>
  const integrationCategories = t('landing.integrations.categories', { returnObjects: true }) as string[]
  const galleryItems = t('landing.gallery.items', { returnObjects: true }) as Array<{
    key: string
    title: string
    altKey: string
  }>

  const heroPhoto = LANDING_PHOTOS.heroFamily

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

      <section className="landing-section landing-hero-split">
        <Row gutter={[40, 32]} align="middle">
          <Col xs={24} lg={12}>
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
          </Col>
          <Col xs={24} lg={12}>
            <div className="landing-hero-visual">
              <img
                src={heroPhoto.src}
                alt={t(heroPhoto.altKey)}
                className="landing-hero-photo"
                loading="eager"
              />
              <LandingScreenshotFrame>
                <LandingScreenshot
                  src={LANDING_SCREENSHOTS.dashboard}
                  alt={t('landing.screenshots.dashboard')}
                  fallback={<MockDashboardPreview />}
                />
              </LandingScreenshotFrame>
            </div>
          </Col>
        </Row>
      </section>

      <section className="landing-section">
        <Title level={2}>{t('landing.pains.title')}</Title>
        <Paragraph type="secondary" className="landing-lead">
          {t('landing.pains.subtitle')}
        </Paragraph>
        <Row gutter={[16, 16]}>
          {pains.map((item) => (
            <Col key={item.title} xs={24} md={8}>
              <Card size="small" className="landing-card landing-pain-card">
                <Text strong style={{ display: 'block', marginBottom: 8 }}>{item.title}</Text>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>{item.body}</Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      <section className="landing-section landing-integrations">
        <Title level={4} className="landing-center-title">{t('landing.integrations.title')}</Title>
        <div className="landing-integration-categories">
          {integrationCategories.map((label) => (
            <span key={label} className="landing-integration-pill">{label}</span>
          ))}
        </div>
        <Paragraph type="secondary" className="landing-center-text landing-hint">
          {t('landing.integrations.hint')}
        </Paragraph>
        <Paragraph type="secondary" className="landing-center-text landing-disclaimer">
          {t('landing.integrations.disclaimer')}
        </Paragraph>
      </section>

      <LandingShowcaseSection
        id="export"
        title={t('landing.showcases.export.title')}
        body={t('landing.showcases.export.body')}
        screenshotSrc={LANDING_SCREENSHOTS.patientOverview}
        screenshotAltKey="landing.screenshots.patientOverview"
        screenshotFallback={<MockExportPreview />}
      />

      <LandingShowcaseSection
        id="ava"
        title={t('landing.showcases.ava.title')}
        body={t('landing.showcases.ava.body')}
        screenshotSrc={LANDING_SCREENSHOTS.avaChat}
        screenshotAltKey="landing.screenshots.avaChat"
        screenshotFallback={<MockAvaChatPreview />}
        imageKey="organizedCare"
        reverse
      />

      <section className="landing-section">
        <Title level={2}>{t('landing.showcases.timeline.title')}</Title>
        <Paragraph type="secondary" className="landing-lead">
          {t('landing.showcases.timeline.body')}
        </Paragraph>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={14}>
            <LandingScreenshotFrame title={t('landing.screenshots.timeline')}>
              <LandingScreenshot
                src={LANDING_SCREENSHOTS.timeline}
                alt={t('landing.screenshots.timeline')}
                fallback={<MockTimelinePreview />}
              />
            </LandingScreenshotFrame>
          </Col>
          <Col xs={24} md={10}>
            <LandingScreenshotFrame title={t('landing.screenshots.exams')}>
              <LandingScreenshot
                src={LANDING_SCREENSHOTS.exams}
                alt={t('landing.screenshots.exams')}
                fallback={<MockGrowthChartPreview />}
              />
            </LandingScreenshotFrame>
          </Col>
        </Row>
      </section>

      <section className="landing-section" id="gallery">
        <Title level={2}>{t('landing.gallery.title')}</Title>
        <Paragraph type="secondary" className="landing-lead">{t('landing.gallery.subtitle')}</Paragraph>
        <Row gutter={[16, 16]}>
          {galleryItems.map((item) => {
            const src = LANDING_SCREENSHOTS[item.key as keyof typeof LANDING_SCREENSHOTS]
            if (!src) return null
            return (
              <Col key={item.key} xs={24} sm={12} md={8}>
                <LandingScreenshotFrame title={item.title}>
                  <LandingScreenshot src={src} alt={t(item.altKey)} />
                </LandingScreenshotFrame>
              </Col>
            )
          })}
        </Row>
      </section>

      <section className="landing-section">
        <Title level={2}>{t('landing.useCases.title')}</Title>
        <Row gutter={[16, 16]}>
          {useCases.map((step, i) => (
            <Col key={step.title} xs={24} md={8}>
              <Card size="small" className="landing-card">
                <Text type="secondary" style={{ fontSize: 12 }}>{t('landing.useCases.stepLabel', { n: i + 1 })}</Text>
                <Text strong style={{ display: 'block', marginTop: 4 }}>{step.title}</Text>
                <Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 8 }}>{step.body}</Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      <section className="landing-section">
        <Title level={2}>{t('landing.features.title')}</Title>
        <Paragraph type="secondary" className="landing-lead">{t('landing.features.subtitle')}</Paragraph>
        <Row gutter={[16, 16]}>
          {features.map((f, i) => {
            const Icon = FEATURE_ICONS[i] ?? TeamOutlined
            return (
              <Col key={f.title} xs={24} sm={12} md={8}>
                <Card size="small" className="landing-card">
                  <Space direction="vertical" size={8}>
                    <Icon style={{ fontSize: 22, color: 'var(--brand-primary, #0d9488)' }} />
                    <Text strong>{f.title}</Text>
                    <Text type="secondary">{f.body}</Text>
                  </Space>
                </Card>
              </Col>
            )
          })}
        </Row>
        <Paragraph type="secondary" className="landing-ava-note">{t('landing.avaDisclaimer')}</Paragraph>
      </section>

      <section className="landing-section landing-pricing" id="pricing">
        <div className="landing-pricing-inner">
          <Title level={2}>{t('landing.pricing.title')}</Title>
          <Paragraph type="secondary">{t('landing.pricing.subtitle')}</Paragraph>
          <Row gutter={[16, 16]} justify="center">
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
          <Paragraph type="secondary" className="landing-pricing-disclaimer">
            {t('landing.pricing.disclaimer')}
          </Paragraph>
          <div className="landing-pricing-cta">
            <Button type="primary" onClick={() => goLogin('signup', 'pricing')}>
              {t('landing.ctaSignup')}
            </Button>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-roadmap-teaser">
          <Title level={4} style={{ marginTop: 0 }}>{t('landing.roadmapTeaser.title')}</Title>
          <ul>
            {(t('landing.roadmapTeaser.items', { returnObjects: true }) as string[]).map((item) => (
              <li key={item}><Text type="secondary">{item}</Text></li>
            ))}
          </ul>
        </div>
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
        <Text type="secondary" className="landing-footer-line">{t('landing.footerNote')}</Text>
        <Text type="secondary" className="landing-footer-line landing-footer-small">{t('landing.photoCredit')}</Text>
      </footer>
    </div>
  )
}
