import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Spin } from 'antd'
import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext.js'
import { api } from '../../lib/api.js'

import { COMPLIANCE_ACCEPT_PATH } from '../../lib/legal-paths.js'
import { trackProductEvent } from '../../lib/product-events.js'

/**
 * Redireciona para /compliance/accept quando há pendência legal.
 * Independente de COMPLIANCE_GATE_ENABLED na API (UI sempre verifica).
 *
 * Valida UMA vez por sessão/conta (não a cada navegação): re-checar no
 * `location.pathname` desmontava todo o AppLayout (sidebar/header) com um
 * Spinner em cada clique — o "refresh completo" percebido pelo usuário.
 */
export function RequireCompliance() {
  const { configured, loading: authLoading, session, authUserId } = useAuth()
  const location = useLocation()
  const [checking, setChecking] = useState(true)
  const [compliant, setCompliant] = useState(true)
  const gateTrackedRef = useRef(false)

  useEffect(() => {
    if (!configured || !authUserId) {
      setChecking(false)
      setCompliant(true)
      return
    }
    let cancelled = false
    setChecking(true)
    api.compliance.status()
      .then((s) => {
        if (!cancelled) setCompliant(s.compliant)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setChecking(false)
      })
    const onAccepted = () => setCompliant(true)
    window.addEventListener('aiyracare:compliance-accepted', onAccepted)
    return () => {
      cancelled = true
      window.removeEventListener('aiyracare:compliance-accepted', onAccepted)
    }
  }, [configured, authUserId])

  useEffect(() => {
    if (checking || compliant || location.pathname === COMPLIANCE_ACCEPT_PATH) return
    if (gateTrackedRef.current) return
    gateTrackedRef.current = true
    trackProductEvent('compliance_gate_redirect', { step: location.pathname.slice(0, 64) })
  }, [checking, compliant, location.pathname])

  if (!configured) return <Outlet />

  if (authLoading || checking) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!compliant && location.pathname !== COMPLIANCE_ACCEPT_PATH) {
    return <Navigate to={COMPLIANCE_ACCEPT_PATH} replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
