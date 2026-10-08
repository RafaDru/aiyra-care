import type { IntegrationOption } from '../../components/integrations/integration-catalog.js'
import { INTEGRATION_OPTIONS } from '../../components/integrations/integration-catalog.js'

export type OnboardingConnectorKind = 'sus' | 'plans' | 'labs' | 'hospitals'

export type OnboardingConnectorStep = {
  id: OnboardingConnectorKind
  stepId: string
  titleKey: string
  subtitleKey: string
  options: IntegrationOption[]
}

const byPortal = (portals: string[]) =>
  INTEGRATION_OPTIONS.filter((o) => o.portalType && portals.includes(o.portalType) && o.enabled)

export const ONBOARDING_CONNECTOR_STEPS: OnboardingConnectorStep[] = [
  {
    id: 'sus',
    stepId: 'connector-sus',
    titleKey: 'onboarding.connectors.susTitle',
    subtitleKey: 'onboarding.connectors.susSubtitle',
    options: INTEGRATION_OPTIONS.filter((o) => o.action === 'conectesus' && o.enabled),
  },
  {
    id: 'plans',
    stepId: 'connector-plans',
    titleKey: 'onboarding.connectors.plansTitle',
    subtitleKey: 'onboarding.connectors.plansSubtitle',
    options: byPortal(['unimed', 'amil', 'bradesco_saude']),
  },
  {
    id: 'labs',
    stepId: 'connector-labs',
    titleKey: 'onboarding.connectors.labsTitle',
    subtitleKey: 'onboarding.connectors.labsSubtitle',
    options: byPortal(['hermes_pardini']),
  },
  {
    id: 'hospitals',
    stepId: 'connector-hospitals',
    titleKey: 'onboarding.connectors.hospitalsTitle',
    subtitleKey: 'onboarding.connectors.hospitalsSubtitle',
    options: byPortal(['mater_dei']),
  },
]
