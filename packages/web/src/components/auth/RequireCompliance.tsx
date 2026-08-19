import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Spin } from 'antd'
import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext.js'
import { api } from '../../lib/api.js'

import { COMPLIANCE_ACCEPT_PATH } from '../../lib/legal-paths.js'

/**
 * Redireciona a /compliance/accept quando há pendência legal.
 * Independente de COMPLIANCE_GATE_ENABLED na API (UI sempre verifica).
 */
export function RequireCompliance() {
  const { configured, loading: authLoading, session, authUserId } = useAuth()
  const location = useLocation()
  const [checking, setChecking] = useState(true)
  const [compliant, setCompliant] = useState(true)

  useEffect(() => {
    if (!configured || !authUserId) {
      setChecking(false)
      setCompliant(true)
      return
    }
    setChecking(true)
    api.compliance.status()
      .then((s) => setCompliant(s.compliant))
      .catch(() => setCompliant(true))
      .finally(() => setChecking(false))
  }, [configured, authUserId, location.pathname])

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
