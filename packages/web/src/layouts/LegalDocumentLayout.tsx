import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { AppLogo } from '../components/brand/AppLogo.js'
import { AIYRACARE_TOKENS } from '../theme/aiyracare-tokens.js'
import { useAuth } from '../contexts/AuthContext.js'
import { api } from '../lib/api.js'
import { COMPLIANCE_ACCEPT_PATH, sanitizeLegalReturnPath } from '../lib/legal-paths.js'

const LEGAL_PAGE_MAX_WIDTH = 920

type Props = {
  children: ReactNode
  backTo?: string
  backLabel?: string
}

/** Layout largo para termos, privacidade e políticas — fora do fluxo estreito do login. */
export function LegalDocumentLayout({ children, backTo, backLabel }: Props) {
  const { t } = useTranslation()
  const { configured, session, loading: authLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const returnParam = sanitizeLegalReturnPath(searchParams.get('return'))
  const [resolvedBack, setResolvedBack] = useState<string | null>(returnParam ?? backTo ?? null)

  useEffect(() => {
    if (returnParam) {
      setResolvedBack(returnParam)
      return
    }
    if (backTo) {
      setResolvedBack(backTo)
      return
    }
    if (!configured || authLoading) return
    if (!session) {
      setResolvedBack('/login')
      return
    }
    api.compliance.status()
      .then((s) => setResolvedBack(s.compliant ? '/' : COMPLIANCE_ACCEPT_PATH))
      .catch(() => setResolvedBack('/'))
  }, [returnParam, backTo, configured, session, authLoading])

  const backPath = resolvedBack ?? '/login'
  const resolvedLabel =
    backLabel ??
    (backPath === COMPLIANCE_ACCEPT_PATH
      ? t('legal.backToAccept')
      : backPath === '/login'
        ? t('legal.backToLogin')
        : t('legal.backToApp'))

  return (
    <div
      className="legal-document-page"
      style={{
        minHeight: '100vh',
        background: 'var(--brand-bg, var(--background))',
        boxSizing: 'border-box',
      }}
    >
      <header
        style={{
          maxWidth: LEGAL_PAGE_MAX_WIDTH,
          margin: '0 auto',
          padding: `${AIYRACARE_TOKENS.paddingLG}px ${AIYRACARE_TOKENS.paddingLG}px 0`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <Link to={backPath} style={{ display: 'flex', alignItems: 'center' }}>
            <AppLogo variant="square" height={72} style={{ maxWidth: 140 }} />
          </Link>
          <Link to={backPath}>
            <Button type="text" icon={<ArrowLeftOutlined />}>
              {resolvedLabel}
            </Button>
          </Link>
        </div>
      </header>
      <main
        style={{
          maxWidth: LEGAL_PAGE_MAX_WIDTH,
          margin: '0 auto',
          padding: `${AIYRACARE_TOKENS.paddingLG}px`,
        }}
      >
        {children}
      </main>
    </div>
  )
}
