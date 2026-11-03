import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, Col, Row, Space, Typography } from 'antd'
import { SafetyOutlined, TeamOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { AppLogo } from '../components/brand/AppLogo.js'
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher.js'
import { ThemeSwitcher } from '../components/ui/ThemeSwitcher.js'
import { trackLandingEvent } from '../lib/landing-events.js'
import { LandingInstitutionalFooter } from '../components/landing/LandingInstitutionalFooter.js'
import { PageMeta } from '../components/seo/PageMeta.js'
import './landing.css'

const { Title, Paragraph, Text } = Typography

const NERI_TILE = '/brand/ananeri-neri-tile.svg'

const PROOF_BRAND_LOGOS: Record<string, string[]> = {
  convenio: ['/brands/unimed-logo.png', '/brands/amil-square.png'],
  sus: ['/brands/sus.svg', '/brands/conectesus-icon.png'],
}

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
    navigate(`/login?mode=${mode}`)
  }

  const proofItems = t('landing.proofConcept.items', { returnObjects: true }) as Array<{
    key: string
    title: string
    body: string
    brandAlt?: string
  }>
  const howSteps = t('landing.howItWorks.steps', { returnObjects: true }) as Array<{ title: string; body: string }>

  return (
    <div className="landing-page">
      <PageMeta
        title={t('landing.seo.title')}
        description={t('landing.seo.description')}
        canonicalPath="/home"
      />
      <header className="landing-header">
        <AppLogo variant="wordmark" height={36} style={{ maxWidth: 200 }} />
        <Space wrap>
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

      <section className="landing-section landing-hero-v2" aria-labelledby="landing-hero-heading">
        <div className="landing-hero-v2-inner">
          <AppLogo variant="horizontal" height={48} className="landing-hero-lockup" />
          <Title level={1} id="landing-hero-heading" className="landing-hero-title">
            {t('landing.heroTitle')}
          </Title>
          <Paragraph className="landing-hero-subtitle" type="secondary">
            {t('landing.heroSubtitle')}
          </Paragraph>
          <Space size="middle" wrap className="landing-hero-ctas">
            <Button type="primary" size="large" onClick={() => goLogin('signup', 'hero')}>
              {t('landing.ctaSignup')}
            </Button>
            <Button size="large" onClick={() => goLogin('login', 'hero')}>
              {t('landing.ctaLogin')}
            </Button>
          </Space>
          <Text type="secondary" className="landing-hero-note">{t('landing.heroNote')}</Text>
        </div>
      </section>

      <section className="landing-section landing-proof" aria-labelledby="landing-proof-heading">
        <Title level={2} id="landing-proof-heading">{t('landing.proofConcept.title')}</Title>
        <Paragraph type="secondary" className="landing-lead">{t('landing.proofConcept.subtitle')}</Paragraph>
        <Row gutter={[16, 16]}>
          {proofItems.map((item) => {
            const logos = PROOF_BRAND_LOGOS[item.key] ?? []
            return (
              <Col key={item.key} xs={24} md={8}>
                <Card size="small" className="landing-card landing-proof-card">
                  <div className="landing-proof-visual" aria-hidden={logos.length === 0}>
                    {item.key === 'familia' ? (
                      <TeamOutlined className="landing-proof-icon" />
                    ) : (
                      logos.map((src) => (
                        <img key={src} src={src} alt="" className="landing-proof-brand" loading="lazy" />
                      ))
                    )}
                  </div>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>{item.title}</Text>
                  <Paragraph type="secondary" style={{ marginBottom: 0 }}>{item.body}</Paragraph>
                </Card>
              </Col>
            )
          })}
        </Row>
        <Paragraph type="secondary" className="landing-disclaimer landing-proof-disclaimer">
          {t('landing.integrations.disclaimer')}
        </Paragraph>
      </section>

      <section className="landing-section landing-neri" id="neri" aria-labelledby="landing-neri-heading">
        <Row gutter={[32, 24]} align="middle">
          <Col xs={24} md={10} className="landing-neri-visual-col">
            <img
              src={NERI_TILE}
              alt={t('landing.neriSection.tileAlt')}
              className="landing-neri-tile"
              loading="lazy"
            />
          </Col>
          <Col xs={24} md={14}>
            <Title level={2} id="landing-neri-heading">{t('landing.neriSection.title')}</Title>
            <Paragraph type="secondary" className="landing-lead">{t('landing.neriSection.lead')}</Paragraph>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>{t('landing.neriSection.body')}</Paragraph>
            <Paragraph type="secondary" className="landing-ava-note">{t('landing.neriSection.disclaimer')}</Paragraph>
          </Col>
        </Row>
      </section>

      <section className="landing-section" aria-labelledby="landing-how-heading">
        <Title level={2} id="landing-how-heading">{t('landing.howItWorks.title')}</Title>
        <Paragraph type="secondary" className="landing-lead">{t('landing.howItWorks.subtitle')}</Paragraph>
        <Row gutter={[16, 16]}>
          {howSteps.map((step, i) => (
            <Col key={step.title} xs={24} md={8}>
              <Card size="small" className="landing-card landing-step-card">
                <span className="landing-step-badge">{t('landing.howItWorks.stepLabel', { n: i + 1 })}</span>
                <Text strong style={{ display: 'block', marginTop: 8 }}>{step.title}</Text>
                <Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 8 }}>{step.body}</Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      <section className="landing-section landing-privacy" id="privacidade" aria-labelledby="landing-privacy-heading">
        <Row gutter={[32, 24]} align="middle">
          <Col xs={24} md={14}>
            <Title level={2} id="landing-privacy-heading">{t('landing.privacy.title')}</Title>
            <Paragraph type="secondary" className="landing-lead">{t('landing.privacy.body')}</Paragraph>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {t('landing.privacy.lgpd')}
              {' '}
              <Link to="/termos">{t('legal.termsLink')}</Link>
              {' · '}
              <Link to="/privacidade">{t('legal.privacyLink')}</Link>
              {' · '}
              <Link to="/cookies">{t('legal.cookiePolicyLink')}</Link>
            </Paragraph>
          </Col>
          <Col xs={24} md={10}>
            <Card size="small" className="landing-card landing-about-card">
              <Space direction="vertical" size={8}>
                <SafetyOutlined className="landing-privacy-icon" />
                <Text strong>{t('landing.privacy.trustTitle')}</Text>
                <Text type="secondary">{t('landing.privacy.trustBody')}</Text>
              </Space>
            </Card>
          </Col>
        </Row>
      </section>

      <LandingInstitutionalFooter />
    </div>
  )
}
