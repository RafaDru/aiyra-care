import { useTranslation } from 'react-i18next'
import {
  resolveWebDeploymentTier,
  shouldShowWebDeploymentBadge,
  type WebDeploymentTier,
} from '../../lib/deployment-tier.js'

const BADGE_CLASS: Record<WebDeploymentTier, string> = {
  integration: 'app-env-badge app-env-badge--integration',
  preview: 'app-env-badge app-env-badge--preview',
  production: 'app-env-badge app-env-badge--production',
}

export function DeploymentEnvironmentBadge() {
  const { t } = useTranslation()
  const tier = resolveWebDeploymentTier()
  if (!tier || !shouldShowWebDeploymentBadge(tier)) return null

  const labelKey =
    tier === 'preview' ? 'environment.staging' : tier === 'production' ? 'environment.production' : 'environment.dev'

  return (
    <div className={BADGE_CLASS[tier]} role="status" aria-label={t(labelKey)}>
      {t(labelKey)}
    </div>
  )
}
