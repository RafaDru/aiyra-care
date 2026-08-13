import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Alert, Spin, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api.js'
import type { LegalDocumentKind, LegalDocumentWithContent } from '../../lib/api.types.js'
import { simpleLegalMarkdownToHtml } from '../../lib/legal-markdown.js'
import { legalDocumentPath, LOGIN_LEGAL_KINDS, sanitizeLegalReturnPath } from '../../lib/legal-paths.js'

const { Title, Text } = Typography

type Props = {
  kind: LegalDocumentKind
  showCrossLinks?: boolean
}

function kindLabel(kind: LegalDocumentKind, t: (key: string) => string): string {
  if (kind === 'terms_of_use') return t('legal.termsLink')
  if (kind === 'privacy_policy') return t('legal.privacyLink')
  if (kind === 'cookie_policy') return t('legal.cookiePolicyLink')
  if (kind === 'minor_guardian_consent') return t('legal.minorConsentLink')
  return kind
}

function formatCnpj(cnpj: string | null): string {
  if (!cnpj || cnpj.length !== 14) return cnpj ?? ''
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`
}

export function LegalDocumentBody({ kind, showCrossLinks = true }: Props) {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const returnTo = sanitizeLegalReturnPath(searchParams.get('return'))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [doc, setDoc] = useState<LegalDocumentWithContent | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    api.compliance.getCurrent(kind)
      .then(setDoc)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [kind])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return <Alert type="error" message={error} showIcon />
  }

  if (!doc) {
    return <Alert type="warning" message={t('legal.notPublished')} showIcon />
  }

  return (
    <>
      <Title level={2} style={{ marginTop: 0 }}>{doc.title}</Title>
      <Text type="secondary">
        {t('legal.version', {
          version: doc.version,
          date: new Date(doc.effectiveAt).toLocaleDateString(),
        })}
      </Text>
      {doc.publisher?.complete && (
        <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
          {doc.publisher.entityName}
          {doc.publisher.cnpj && ` — CNPJ ${formatCnpj(doc.publisher.cnpj)}`}
        </Text>
      )}
      <div
        className="legal-prose"
        dangerouslySetInnerHTML={{ __html: simpleLegalMarkdownToHtml(doc.content) }}
      />
      {showCrossLinks && (
        <nav className="legal-document-nav" aria-label={t('legal.relatedDocs')}>
          {LOGIN_LEGAL_KINDS.filter((k) => k !== kind).map((k) => (
            <Link key={k} to={legalDocumentPath(k, returnTo)}>{kindLabel(k, t)}</Link>
          ))}
        </nav>
      )}
    </>
  )
}
