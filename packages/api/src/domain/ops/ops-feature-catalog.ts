/**
 * Catálogo humanizado de features do app — chaves técnicas → labels para ops/console.
 * Alinhado com packages/web/src/lib/client-error-fingerprint.ts
 */

export type OpsObservabilitySection = 'infra' | 'product' | 'sync' | 'ava' | 'cost'

export interface OpsFeatureCatalogEntry {
  key: string
  label: string
  area: string
  section: OpsObservabilitySection
  routeExample?: string
  description?: string
}

const ROUTE_FEATURES: OpsFeatureCatalogEntry[] = [
  {
    key: 'dashboard',
    label: 'Lista de pacientes',
    area: 'Início',
    section: 'product',
    routeExample: '/',
    description: 'Home com cards dos dependentes',
  },
  {
    key: 'patient_context',
    label: 'Resumo clínico',
    area: 'Paciente',
    section: 'product',
    routeExample: '/patients/:id/context',
  },
  {
    key: 'patient_detail',
    label: 'Perfil do paciente',
    area: 'Paciente',
    section: 'product',
    routeExample: '/patients/:id',
    description: 'Carteira, abas clínicas, integrações',
  },
  {
    key: 'integrations',
    label: 'Integrações (hub)',
    area: 'Integrações',
    section: 'sync',
    routeExample: '/integrations',
  },
  {
    key: 'billing',
    label: 'Plano e pagamento',
    area: 'Conta',
    section: 'product',
    routeExample: '/settings/plan',
  },
  {
    key: 'settings',
    label: 'Configurações',
    area: 'Conta',
    section: 'product',
    routeExample: '/settings',
  },
  {
    key: 'onboarding',
    label: 'Onboarding',
    area: 'Conta',
    section: 'product',
    routeExample: '/onboarding',
  },
  {
    key: 'emergency',
    label: 'Emergência',
    area: 'Clínico',
    section: 'product',
    routeExample: '/emergency',
  },
  {
    key: 'roadmap',
    label: 'Roadmap interno',
    area: 'Dev',
    section: 'product',
    routeExample: '/roadmap',
  },
  {
    key: 'app',
    label: 'Outras rotas',
    area: 'App',
    section: 'product',
  },
  {
    key: 'ui',
    label: 'Erro de interface',
    area: 'UI',
    section: 'product',
    description: 'Boundary React / erro não classificado',
  },
]

const API_FEATURES: OpsFeatureCatalogEntry[] = [
  {
    key: 'api:ava',
    label: 'Ava (chat)',
    area: 'Ava',
    section: 'ava',
    description: 'Turnos, quota, cascade',
  },
  {
    key: 'api:integration_links',
    label: 'Links de integração',
    area: 'Integrações',
    section: 'sync',
    description: 'Sync manual e status de portais',
  },
  {
    key: 'api:patients:item',
    label: 'Paciente (detalhe API)',
    area: 'Paciente',
    section: 'product',
  },
  {
    key: 'api:telemetry',
    label: 'Telemetria',
    area: 'Sistema',
    section: 'product',
  },
  {
    key: 'api:compliance',
    label: 'Compliance / LGPD',
    area: 'Conta',
    section: 'product',
  },
  {
    key: 'api:documents',
    label: 'Documentos',
    area: 'Paciente',
    section: 'product',
  },
  {
    key: 'api:root',
    label: 'API raiz',
    area: 'Sistema',
    section: 'infra',
  },
]

const CATALOG_BY_KEY = new Map<string, OpsFeatureCatalogEntry>()
for (const entry of [...ROUTE_FEATURES, ...API_FEATURES]) {
  CATALOG_BY_KEY.set(entry.key, entry)
}

const API_RESOURCE_LABELS: Record<string, string> = {
  exams: 'Exames',
  timeline: 'Linha do tempo',
  wallet: 'Carteira',
  authorizations: 'Autorizações',
  vaccines: 'Vacinas',
  records: 'Prontuário',
  graph: 'Encadeamento',
  hygiene: 'Higiene de dados',
  health_threads: 'Investigações',
  emergency: 'Emergência',
  context: 'Contexto clínico',
  sync: 'Sync',
  ava: 'Ava',
  billing: 'Billing',
  patients: 'Pacientes',
}

function humanizeSlug(slug: string): string {
  return API_RESOURCE_LABELS[slug] ?? slug.replace(/_/g, ' ')
}

/** Espelha deriveFeatureFromRoute no web. */
export function deriveFeatureKeyFromRoute(route: string): string {
  const path = route.split('?')[0].replace(/\/+$/, '') || '/'
  if (path === '/' || path === '') return 'dashboard'
  if (path.startsWith('/patients/') && path.includes('/context')) return 'patient_context'
  if (path.startsWith('/patients/')) return 'patient_detail'
  if (path.startsWith('/integrations')) return 'integrations'
  if (path.startsWith('/settings/plan')) return 'billing'
  if (path.startsWith('/settings')) return 'settings'
  if (path.startsWith('/onboarding')) return 'onboarding'
  if (path.startsWith('/emergency')) return 'emergency'
  if (path.startsWith('/roadmap')) return 'roadmap'
  return 'app'
}

/** Espelha deriveFeatureFromApiPath no web. */
export function deriveFeatureKeyFromApiPath(apiPath: string): string {
  const base = apiPath.split('?')[0]
  const segments = base.split('/').filter(Boolean)
  if (!segments.length) return 'api:root'
  if (segments[0] === 'patients' && segments.length >= 3) {
    return `api:patients:${segments[2] ?? 'resource'}`
  }
  if (segments[0] === 'patients' && segments.length === 2) {
    return 'api:patients:item'
  }
  if (segments[0] === 'integration-links') return 'api:integration_links'
  if (segments[0] === 'ava') return 'api:ava'
  return `api:${segments[0]}`
}

const EVENT_FEATURE_OVERRIDES: Record<string, string> = {
  ava_chat_started: 'api:ava',
  ava_chat_completed: 'api:ava',
  ava_chat_failed: 'api:ava',
  ava_quota_blocked: 'api:ava',
  ava_context_pin: 'api:ava',
  ava_context_unpin: 'api:ava',
  ava_patient_switch_hook: 'api:ava',
  ava_proposed_action_executed: 'api:ava',
  sync_job_terminal: 'api:integration_links',
  billing_checkout_started: 'billing',
  billing_checkout_completed: 'billing',
  hygiene_prompt_shown: 'patient_detail',
  hygiene_resolved: 'patient_detail',
  onboarding_step: 'onboarding',
  landing_page_view: 'app',
  landing_cta_click: 'app',
}

/** Atribui feature para agregar product_events. */
export function resolveFeatureKeyFromProductEvent(
  eventName: string,
  route?: string | null,
): string {
  const override = EVENT_FEATURE_OVERRIDES[eventName]
  if (override) return override
  if (route?.trim()) return deriveFeatureKeyFromRoute(route.trim())
  return 'app'
}

function humanizeApiFeatureKey(key: string): OpsFeatureCatalogEntry {
  const parts = key.split(':')
  if (parts[0] !== 'api') {
    return {
      key,
      label: key.replace(/_/g, ' '),
      area: 'App',
      section: 'product',
    }
  }
  if (parts.length >= 2 && parts[1] === 'patients' && parts[2]) {
    return {
      key,
      label: `Paciente · ${humanizeSlug(parts[2])}`,
      area: 'Paciente',
      section: 'product',
    }
  }
  const root = parts[1] ?? 'api'
  const known = CATALOG_BY_KEY.get(key)
  if (known) return known
  return {
    key,
    label: `API · ${humanizeSlug(root)}`,
    area: 'API',
    section: root === 'ava' ? 'ava' : root === 'integration_links' ? 'sync' : 'product',
  }
}

export function resolveOpsFeatureEntry(featureKey: string): OpsFeatureCatalogEntry {
  const exact = CATALOG_BY_KEY.get(featureKey)
  if (exact) return { ...exact, key: featureKey }
  if (featureKey.startsWith('api:')) return humanizeApiFeatureKey(featureKey)
  return {
    key: featureKey,
    label: featureKey.replace(/_/g, ' '),
    area: 'App',
    section: 'product',
  }
}

export function resolveOpsFeatureLabel(featureKey: string): string {
  return resolveOpsFeatureEntry(featureKey).label
}

export function getOpsFeatureCatalog(): OpsFeatureCatalogEntry[] {
  const keys = new Set(CATALOG_BY_KEY.keys())
  return Array.from(keys)
    .map((key) => CATALOG_BY_KEY.get(key)!)
    .sort((a, b) => a.area.localeCompare(b.area) || a.label.localeCompare(b.label))
}

export const OPS_OBSERVABILITY_SECTIONS: Array<{
  id: OpsObservabilitySection
  title: string
  description: string
}> = [
  {
    id: 'infra',
    title: 'Infraestrutura',
    description: 'Sonda sintética, runtime degradado e saúde de dependências.',
  },
  {
    id: 'product',
    title: 'Produto & UX',
    description: 'Uso do app, erros de cliente e mapa de features.',
  },
  {
    id: 'sync',
    title: 'Sync & integrações',
    description: 'Jobs por portal, falhas e sincronização de convênios.',
  },
  {
    id: 'ava',
    title: 'Ava & LLM',
    description: 'Turnos, tokens, mix de provedores e quota.',
  },
  {
    id: 'cost',
    title: 'Custo interno',
    description: 'Classificador, higiene e orçamento LLM interno.',
  },
]
