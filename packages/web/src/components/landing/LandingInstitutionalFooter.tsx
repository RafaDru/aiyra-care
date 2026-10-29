import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Space, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api.js'
import {
  formatCnpj,
  getLegalPublisherFromEnv,
  mergeLegalPublisher,
  type LegalPublisherDisplay,
} from '../../lib/legal-publisher.js'
import { trackLandingEvent } from '../../lib/landing-events.js'

const { Text } = Typography

export function LandingInstitutionalFooter() {
  const { t } = useTranslation()
  const [publisher, setPublisher] = useState<LegalPublisherDisplay>(() => getLegalPublisherFromEnv())

  useEffect(() => {
    api.compliance
      .contact()
      .then((contact) => {
        setPublisher(mergeLegalPublisher(contact.publisher, getLegalPublisherFromEnv()))
      })
      .catch(() => {
        setPublisher(getLegalPublisherFromEnv())
      })
  }, [])

  const trackCta = (cta_target: string) => {
    trackLandingEvent('landing_cta_click', { cta_target, section: 'footer' })
  }

  return (
    <footer className="landing-footer">
      <nav aria-label={t('landing.footerNavLabel')}>
        <Space split={<span aria-hidden="true">·</span>} wrap size="small">
          <Link to="/termos" data-testid="landing-footer-link-terms" onClick={() => trackCta('terms')}>{t('legal.termsLink')}</Link>
          <Link to="/privacidade" data-testid="landing-footer-link-privacy" onClick={() => trackCta('privacy')}>{t('legal.privacyLink')}</Link>
          <Link to="/cookies" data-testid="landing-footer-link-cookies" onClick={() => trackCta('cookies')}>{t('legal.cookiePolicyLink')}</Link>
          <Link to="/login?mode=login" onClick={() => trackCta('login')}>{t('landing.ctaLogin')}</Link>
        </Space>
      </nav>
      {publisher.complete ? (
        <Text type="secondary" className="landing-footer-line">
          {publisher.entityName}
          {publisher.cnpj && ` — CNPJ ${formatCnpj(publisher.cnpj)}`}
        </Text>
      ) : (
        <Text type="secondary" className="landing-footer-line">{t('landing.footerPublisherPending')}</Text>
      )}
      <Text type="secondary" className="landing-footer-line">{t('landing.footerNote')}</Text>
      <Text type="secondary" className="landing-footer-line landing-footer-small">{t('landing.photoCredit')}</Text>
    </footer>
  )
}
