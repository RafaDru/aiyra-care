import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

export type RoadmapEpicSummary = {
  id: string
  title: string
  priority: string
  category: string
  status: string
  statusLabel?: string
  summary?: string
  inProgressItems: number
}

export type FeatureCardSummary = {
  id: string
  epicId?: string
  title: string
  status: string
  priority: string
  category: string
  doc: string
  suiteId?: string
  suiteDoc?: string
}

export type ProductLifecycleSnapshot = {
  loadedAt: string
  roadmapUpdatedAt?: string
  featuresUpdatedAt?: string
  epicsInProgress: RoadmapEpicSummary[]
  features: FeatureCardSummary[]
}

type RoadmapItem = {
  id: string
  title: string
  status?: string
  detail?: string
  reviewBadge?: string
}

type RoadmapFile = {
  updatedAt?: string
  epics?: Array<{
    id: string
    title: string
    priority: string
    category: string
    status: string
    statusLabel?: string
    summary?: string
    items?: RoadmapItem[]
  }>
}

type FeaturesIndexFile = {
  updatedAt?: string
  features?: Array<{
    id: string
    epicId?: string
    title: string
    status: string
    priority: string
    category: string
    doc: string
  }>
}

function readJsonFile<T>(path: string): T | null {
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T
  } catch {
    return null
  }
}

function resolveSuiteForFeature(
  monorepoRoot: string,
  featureId: string,
  docPath: string,
): { suiteId?: string; suiteDoc?: string } {
  const suitesDir = resolve(monorepoRoot, 'docs/testing/suites')
  const byId = resolve(suitesDir, `${featureId}.md`)
  if (existsSync(byId)) {
    return { suiteId: featureId, suiteDoc: `docs/testing/suites/${featureId}.md` }
  }

  const featureDoc = resolve(monorepoRoot, docPath)
  if (!existsSync(featureDoc)) return {}

  const content = readFileSync(featureDoc, 'utf8')
  const suiteRow = content.match(/\|\s*\*\*Suite\*\*\s*\|\s*[^`]*`([^`]+)`/)
  if (suiteRow?.[1]) {
    const suiteDoc = suiteRow[1].replace(/^\.\.\//, 'docs/')
    const suiteId = suiteDoc.split('/').pop()?.replace(/\.md$/, '')
    return { suiteId, suiteDoc }
  }

  const cmdMatch = content.match(/qa:run\s+--\s+--suite\s+([a-z0-9-]+)/i)
  if (cmdMatch?.[1]) {
    const suiteId = cmdMatch[1]
    const suiteDoc = `docs/testing/suites/${suiteId}.md`
    if (existsSync(resolve(monorepoRoot, suiteDoc))) {
      return { suiteId, suiteDoc }
    }
    return { suiteId }
  }

  return {}
}

const ALLOWED_MARKDOWN_PREFIXES = ['docs/features/', 'docs/testing/suites/']

export type EpicDetailPayload = {
  id: string
  title: string
  priority: string
  category: string
  status: string
  statusLabel?: string
  summary?: string
  items: Array<{
    id: string
    title: string
    status: string
    detail?: string
    reviewBadge?: string
  }>
}

export type FeatureMarkdownPayload = {
  id: string
  title: string
  doc: string
  markdown: string
}

export function loadEpicDetail(monorepoRoot: string, epicId: string): EpicDetailPayload | null {
  const roadmapPath = resolve(monorepoRoot, 'docs/roadmap.json')
  const roadmap = readJsonFile<RoadmapFile>(roadmapPath)
  const epic = roadmap?.epics?.find((e) => e.id === epicId)
  if (!epic) return null
  return {
    id: epic.id,
    title: epic.title,
    priority: epic.priority,
    category: epic.category,
    status: epic.status,
    statusLabel: epic.statusLabel,
    summary: epic.summary,
    items: (epic.items ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status ?? 'planned',
      detail: item.detail,
      reviewBadge: item.reviewBadge,
    })),
  }
}

export function loadFeatureMarkdown(monorepoRoot: string, featureId: string): FeatureMarkdownPayload | null {
  const featuresPath = resolve(monorepoRoot, 'docs/features/index.json')
  const featuresIndex = readJsonFile<FeaturesIndexFile>(featuresPath)
  const feature = featuresIndex?.features?.find((f) => f.id === featureId)
  if (!feature) return null
  const abs = resolve(monorepoRoot, feature.doc)
  if (!existsSync(abs)) {
    return { id: feature.id, title: feature.title, doc: feature.doc, markdown: `_Arquivo não encontrado: \`${feature.doc}\`_` }
  }
  const markdown = readFileSync(abs, 'utf8')
  return { id: feature.id, title: feature.title, doc: feature.doc, markdown }
}

export function loadRepoMarkdown(monorepoRoot: string, relativePath: string): { path: string; markdown: string } | null {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!ALLOWED_MARKDOWN_PREFIXES.some((p) => normalized.startsWith(p)) || normalized.includes('..')) {
    return null
  }
  const abs = resolve(monorepoRoot, normalized)
  if (!existsSync(abs)) return null
  return { path: normalized, markdown: readFileSync(abs, 'utf8') }
}

export function loadProductLifecycle(monorepoRoot: string): ProductLifecycleSnapshot {
  const roadmapPath = resolve(monorepoRoot, 'docs/roadmap.json')
  const featuresPath = resolve(monorepoRoot, 'docs/features/index.json')

  const roadmap = readJsonFile<RoadmapFile>(roadmapPath)
  const featuresIndex = readJsonFile<FeaturesIndexFile>(featuresPath)

  const epicsInProgress = (roadmap?.epics ?? [])
    .filter((e) => e.status === 'in_progress')
    .map((e) => ({
      id: e.id,
      title: e.title,
      priority: e.priority,
      category: e.category,
      status: e.status,
      statusLabel: e.statusLabel,
      summary: e.summary,
      inProgressItems: (e.items ?? []).filter((i) => i.status === 'in_progress').length,
    }))
    .sort((a, b) => a.priority.localeCompare(b.priority))

  const features = (featuresIndex?.features ?? []).map((f) => {
    const suite = resolveSuiteForFeature(monorepoRoot, f.id, f.doc)
    return {
      id: f.id,
      epicId: f.epicId,
      title: f.title,
      status: f.status,
      priority: f.priority,
      category: f.category,
      doc: f.doc,
      ...suite,
    }
  })

  return {
    loadedAt: new Date().toISOString(),
    roadmapUpdatedAt: roadmap?.updatedAt,
    featuresUpdatedAt: featuresIndex?.updatedAt,
    epicsInProgress,
    features,
  }
}
