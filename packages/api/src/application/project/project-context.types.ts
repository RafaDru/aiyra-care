import type { HistoricoSession } from '../../infrastructure/docs/historico.parser.js'

export interface ProjectContextDocumentationSource {
  path: string
  role: string
  format: 'markdown' | 'json'
}

export interface ProjectContextLayer {
  id: string
  name: string
  description: string
  usesLlm: boolean
  status: 'operational' | 'in_progress' | 'planned' | 'mvp'
}

export interface ProjectContextDecision {
  id: string
  date?: string
  title: string
  decision: string
  rationale: string
  status: 'active' | 'superseded' | 'planned'
}

export interface ProjectContextDomainEntity {
  name: string
  table?: string
  description: string
}

export interface ProjectContextApiRoute {
  method: string
  path: string
  description: string
}

export interface ProjectContextIntegration {
  portal: string
  syncAutomatic: boolean
  authMethod: string
  imports: string[]
}

export interface ProjectContextPlannedWork {
  id: string
  title: string
  status: 'done' | 'in_progress' | 'planned'
  notes?: string
}

export interface ProjectContextSnapshot {
  schemaVersion: number
  generatedAt: string
  application: {
    name: string
    repository: string
    stack: string[]
    localUrls: { api: string; web: string }
    patientsFocus: string[]
  }
  textSummary: string
  architecture: {
    pattern: string
    postgresRole: string
    neo4jRole: string
    principle: string
  }
  layers: ProjectContextLayer[]
  domains: ProjectContextDomainEntity[]
  apiRoutes: ProjectContextApiRoute[]
  integrations: ProjectContextIntegration[]
  healthThreads: {
    kinds: string[]
    linkRoles: string[]
    linkEntityTypes: string[]
    workflowNotes: string[]
  }
  relationCatalog: {
    status: 'planned' | 'partial' | 'operational'
    summary: string
    plannedTables: string[]
    separation: { threadEntity: string; entityEntity: string }
  }
  decisions: ProjectContextDecision[]
  plannedWork: ProjectContextPlannedWork[]
  documentationSources: ProjectContextDocumentationSource[]
}

export interface ProjectContext extends ProjectContextSnapshot {
  migrations: string[]
  historico: {
    sessionCount: number
    sessions: HistoricoSession[]
    latestSession?: HistoricoSession
  }
}
