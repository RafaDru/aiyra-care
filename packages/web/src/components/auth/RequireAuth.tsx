import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuth } from '../../contexts/AuthContext.js'

/** Exige sessão Supabase quando auth está configurado; modo legado sem env vars. */
export function RequireAuth() {
  const { configured, loading, session } = useAuth()
  const location = useLocation()

  if (!configured) return <Outlet />

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
