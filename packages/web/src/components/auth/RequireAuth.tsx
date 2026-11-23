import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.js'
import { CenteredPageLoading } from '../ui/CenteredLoading.js'

/** Exige sessão Supabase quando auth está configurado; modo legado sem env vars. */
export function RequireAuth() {
  const { configured, loading, session } = useAuth()
  const location = useLocation()

  if (!configured) return <Outlet />

  if (loading) return <CenteredPageLoading />

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
