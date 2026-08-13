import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Space, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api.js'
import type { ComplianceContactInfo } from '../../lib/api.types.js'

const { Text, Title } = Typography

export function LegalContactCard() {
  const { t } = useTranslation()
  const [contact, setContact] = useState<ComplianceContactInfo | null>(null)

  useEffect(() => {
    api.compliance.contact().then(setContact).catch(() => setContact(null))
  }, [])

  if (!contact) return null

  return (
    <Card size="small" style={{ marginTop: 16 }}>
      <Title level={5} style={{ marginTop: 0 }}>{t('legal.contactTitle')}</Title>
      <Space direction="vertical" size={4}>
        <Text>
          {t('legal.privacyEmail')}:{' '}
          <a href={`mailto:${contact.privacyEmail}`}>{contact.privacyEmail}</a>
        </Text>
        {contact.supportEmail && (
          <Text>
            {t('legal.supportEmail')}:{' '}
            <a href={`mailto:${contact.supportEmail}`}>{contact.supportEmail}</a>
          </Text>
        )}
        {contact.publisher?.complete && (
          <Text type="secondary">
            {contact.publisher.entityName}
            {contact.publisher.cnpj && ` — CNPJ ${contact.publisher.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}`}
          </Text>
        )}
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t('legal.dpoSla', { days: contact.dpoSlaDays })}
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t('legal.dataSubjectHint')}
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          <Link to="/termos">{t('legal.termsLink')}</Link>
          {' · '}
          <Link to="/privacidade">{t('legal.privacyLink')}</Link>
          {' · '}
          <Link to="/cookies">{t('legal.cookiePolicyLink')}</Link>
        </Text>
      </Space>
    </Card>
  )
}
