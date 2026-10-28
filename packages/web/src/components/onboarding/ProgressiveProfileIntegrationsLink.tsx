import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from 'antd'
import { buildPatientTabHref } from '../../lib/patient-navigation.js'
import { trackProductEvent } from '../../lib/product-events.js'

type Props = {
  patientId: string
  /** Identificador da superfície — enviado em telemetria (sem PHI). */
  surface: string
  variant?: 'button' | 'link'
  buttonType?: 'primary' | 'default'
  testId?: string
  children: ReactNode
}

/** Anel B — deep link para Integrações sem reabrir o wizard. */
export function ProgressiveProfileIntegrationsLink({
  patientId,
  surface,
  variant = 'button',
  buttonType = 'default',
  testId = 'progressive-profile-integrations-cta',
  children,
}: Props) {
  const href = buildPatientTabHref(patientId, 'integrations')

  const onClick = () => {
    trackProductEvent('progressive_profile_cta_click', {
      step: 'progressive_profile_integrations_cta',
      surface,
    }, { patientId })
  }

  if (variant === 'link') {
    return (
      <Link to={href} data-testid={testId} onClick={onClick}>
        {children}
      </Link>
    )
  }

  return (
    <Link to={href} data-testid={testId} onClick={onClick} style={{ display: 'inline-block' }}>
      <Button size="small" type={buttonType}>
        {children}
      </Button>
    </Link>
  )
}
