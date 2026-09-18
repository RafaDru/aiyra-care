import { existsSync, readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

export type StrategySectionId = 'mkt' | 'finance' | 'cx'

export type StrategyManifest = {
  updatedAt: string
  source?: string
  sections: Record<
    StrategySectionId,
    {
      title: string
      primaryFile: string
      secondaryFile?: string
      advisorSkill: string
    }
  >
}

export type StrategyContentPayload = {
  section: StrategySectionId
  title: string
  updatedAt: string
  advisorSkill: string
  primaryMarkdown: string
  secondaryMarkdown?: string
  secondaryTitle?: string
}

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const strategyDir = resolve(pkgRoot, 'content', 'strategy')

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

export function loadStrategyManifest(): StrategyManifest {
  const manifestPath = resolve(strategyDir, 'manifest.json')
  if (!existsSync(manifestPath)) {
    throw new Error(`Strategy manifest missing: ${manifestPath}`)
  }
  return readJson<StrategyManifest>(manifestPath)
}

export function loadStrategyContent(section: StrategySectionId): StrategyContentPayload {
  const manifest = loadStrategyManifest()
  const meta = manifest.sections[section]
  if (!meta) {
    throw new Error(`Unknown strategy section: ${section}`)
  }
  const primaryPath = resolve(strategyDir, meta.primaryFile)
  if (!existsSync(primaryPath)) {
    throw new Error(`Strategy file missing: ${primaryPath}`)
  }
  let secondaryMarkdown: string | undefined
  if (meta.secondaryFile) {
    const secondaryPath = resolve(strategyDir, meta.secondaryFile)
    if (existsSync(secondaryPath)) {
      secondaryMarkdown = readFileSync(secondaryPath, 'utf8')
    }
  }
  return {
    section,
    title: meta.title,
    updatedAt: manifest.updatedAt,
    advisorSkill: meta.advisorSkill,
    primaryMarkdown: readFileSync(primaryPath, 'utf8'),
    secondaryMarkdown,
    secondaryTitle: meta.secondaryFile ? 'Round 2 — plano de simulação' : undefined,
  }
}
