import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Space, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api.js'
import { useAuth } from '../../contexts/AuthContext.js'
import {
  COOKIE_CONSENT_VERSION,
  hasCookieConsent,
  setCookieConsent,
} from '../../lib/cookie-consent.js'

const { Text } = Typography

export function CookieConsentBanner() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const [visible, setVisible] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setVisible(!hasCookieConsent())
  }, [])

  if (!visible) return null

  const accept = async () => {
    setSaving(true)
    try {
      setCookieConsent()
      if (session) {
        await api.compliance.accept({ kinds: ['cookie_policy'] })
      }
      setVisible(false)
    } catch {
      setCookieConsent()
      setVisible(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        padding: '12px 20px',
        background: 'var(--ant-color-bg-elevated)',
        borderTop: '1px solid var(--ant-color-border-secondary)',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.08)',
      }}
    >
      <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <Text style={{ flex: 1, minWidth: 200 }}>
          {t('legal.cookieBanner', { version: COOKIE_CONSENT_VERSION })}
          {' '}
          <Link to="/cookies">{t('legal.cookiePolicyLink')}</Link>
        </Text>
        <Space>
          <Button type="primary" loading={saving} onClick={accept}>
            {t('legal.cookieAccept')}
          </Button>
        </Space>
      </div>
    </div>
  )
}
