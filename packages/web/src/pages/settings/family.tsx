import { Navigate } from 'react-router-dom'
import { FAMILY_HUB_PATH } from '../../lib/family-paths.js'

/** Legado — família saiu de Configurações; manter URL antiga. */
export function SettingsFamilyPage() {
  return <Navigate to={FAMILY_HUB_PATH} replace />
}
