import { readFileSync } from 'fs'
import { resolve } from 'path'

export const GROWTH_CHANNEL_STATUSES = ['done', 'partial', 'planned'] as const
export const GROWTH_PHASE_STATUSES = ['done', 'partial', 'planned'] as const

export type GrowthChannelStatus = (typeof GROWTH_CHANNEL_STATUSES)[number]
export type GrowthPhaseStatus = (typeof GROWTH_PHASE_STATUSES)[number]

export type GrowthConsultorioPhase = {
  id: string
  title: string
  status: GrowthPhaseStatus
  headline: string
  note: string
  doc?: string
}

export type GrowthConsultorioChannel = {
  id: string
  name: string
  status: GrowthChannelStatus
  featureRef?: string
}

export type GrowthNorthStarMetric = {
  id: string
  label: string
  event: string
  stage: string
}

export type GrowthOpenDecision = {
  id: string
  question: string
  owner: string
}

export type GrowthConsultorioBoard = {
  updatedAt: string
  summary: string
  phases: GrowthConsultorioPhase[]
  channels: GrowthConsultorioChannel[]
  northStarMetrics: GrowthNorthStarMetric[]
  openDecisions: GrowthOpenDecision[]
}

export type GrowthConsultorioBoardSnapshot = GrowthConsultorioBoard & {
  loadedAt: string
  sourceRelativePath: string
}

const BOARD_RELATIVE_PATH = 'docs/product/GROWTH_CONSULTORIO_BOARD.json'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parsePhaseStatus(raw: unknown, context: string): GrowthPhaseStatus {
  if (!GROWTH_PHASE_STATUSES.includes(raw as GrowthPhaseStatus)) {
    throw new Error(`${context}: invalid status "${String(raw)}"`)
  }
  return raw as GrowthPhaseStatus
}

function parseChannelStatus(raw: unknown, context: string): GrowthChannelStatus {
  if (!GROWTH_CHANNEL_STATUSES.includes(raw as GrowthChannelStatus)) {
    throw new Error(`${context}: invalid status "${String(raw)}"`)
  }
  return raw as GrowthChannelStatus
}

function parseBoard(raw: unknown): GrowthConsultorioBoard {
  if (!isRecord(raw)) throw new Error('growth_consultorio_board: root must be object')
  const { updatedAt, summary, phases, channels, northStarMetrics, openDecisions } = raw
  if (typeof updatedAt !== 'string' || !updatedAt.trim()) {
    throw new Error('growth_consultorio_board: invalid updatedAt')
  }
  if (typeof summary !== 'string') throw new Error('growth_consultorio_board: invalid summary')
  if (!Array.isArray(phases)) throw new Error('growth_consultorio_board: phases must be array')
  if (!Array.isArray(channels)) throw new Error('growth_consultorio_board: channels must be array')
  if (!Array.isArray(northStarMetrics)) {
    throw new Error('growth_consultorio_board: northStarMetrics must be array')
  }
  if (!Array.isArray(openDecisions)) {
    throw new Error('growth_consultorio_board: openDecisions must be array')
  }

  return {
    updatedAt: updatedAt.trim(),
    summary,
    phases: phases.map((p, i) => {
      if (!isRecord(p)) throw new Error(`phases[${i}]: expected object`)
      const { id, title, status, headline, note, doc } = p
      if (typeof id !== 'string' || !id.trim()) throw new Error(`phases[${i}]: invalid id`)
      if (typeof title !== 'string' || !title.trim()) throw new Error(`phases[${i}]: invalid title`)
      if (typeof headline !== 'string') throw new Error(`phases[${i}]: invalid headline`)
      if (typeof note !== 'string') throw new Error(`phases[${i}]: invalid note`)
      if (doc !== undefined && typeof doc !== 'string') throw new Error(`phases[${i}]: invalid doc`)
      return {
        id: id.trim(),
        title: title.trim(),
        status: parsePhaseStatus(status, `phases[${i}]`),
        headline,
        note,
        ...(doc ? { doc: doc.trim() } : {}),
      }
    }),
    channels: channels.map((c, i) => {
      if (!isRecord(c)) throw new Error(`channels[${i}]: expected object`)
      const { id, name, status, featureRef } = c
      if (typeof id !== 'string' || !id.trim()) throw new Error(`channels[${i}]: invalid id`)
      if (typeof name !== 'string' || !name.trim()) throw new Error(`channels[${i}]: invalid name`)
      if (featureRef !== undefined && typeof featureRef !== 'string') {
        throw new Error(`channels[${i}]: invalid featureRef`)
      }
      return {
        id: id.trim(),
        name: name.trim(),
        status: parseChannelStatus(status, `channels[${i}]`),
        ...(featureRef ? { featureRef: featureRef.trim() } : {}),
      }
    }),
    northStarMetrics: northStarMetrics.map((m, i) => {
      if (!isRecord(m)) throw new Error(`northStarMetrics[${i}]: expected object`)
      const { id, label, event, stage } = m
      if (typeof id !== 'string' || !id.trim()) throw new Error(`northStarMetrics[${i}]: invalid id`)
      if (typeof label !== 'string' || !label.trim()) {
        throw new Error(`northStarMetrics[${i}]: invalid label`)
      }
      if (typeof event !== 'string' || !event.trim()) {
        throw new Error(`northStarMetrics[${i}]: invalid event`)
      }
      if (typeof stage !== 'string' || !stage.trim()) {
        throw new Error(`northStarMetrics[${i}]: invalid stage`)
      }
      return {
        id: id.trim(),
        label: label.trim(),
        event: event.trim(),
        stage: stage.trim(),
      }
    }),
    openDecisions: openDecisions.map((d, i) => {
      if (!isRecord(d)) throw new Error(`openDecisions[${i}]: expected object`)
      const { id, question, owner } = d
      if (typeof id !== 'string' || !id.trim()) throw new Error(`openDecisions[${i}]: invalid id`)
      if (typeof question !== 'string' || !question.trim()) {
        throw new Error(`openDecisions[${i}]: invalid question`)
      }
      if (typeof owner !== 'string' || !owner.trim()) {
        throw new Error(`openDecisions[${i}]: invalid owner`)
      }
      return { id: id.trim(), question: question.trim(), owner: owner.trim() }
    }),
  }
}

export function loadGrowthConsultorioBoard(monorepoRoot: string): GrowthConsultorioBoardSnapshot {
  const boardPath = resolve(monorepoRoot, BOARD_RELATIVE_PATH)
  const text = readFileSync(boardPath, 'utf8')
  const parsed = parseBoard(JSON.parse(text) as unknown)
  return {
    ...parsed,
    loadedAt: new Date().toISOString(),
    sourceRelativePath: BOARD_RELATIVE_PATH,
  }
}
