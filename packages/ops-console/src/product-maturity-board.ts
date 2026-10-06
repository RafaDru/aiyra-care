import { readFileSync } from 'fs'
import { resolve } from 'path'

export const PRODUCT_MATURITY_LEVELS = [
  'mature',
  'operational',
  'partial',
  'pilot',
  'planned',
] as const

export type ProductMaturityLevel = (typeof PRODUCT_MATURITY_LEVELS)[number]

export type ProductMaturityItem = {
  id: string
  title: string
  maturity: ProductMaturityLevel
  note: string
  doc?: string
}

export type ProductMaturityDomain = {
  id: string
  title: string
  items: ProductMaturityItem[]
}

export type ProductMaturityBoard = {
  updatedAt: string
  summary: string
  surfaces: ProductMaturityItem[]
  domains: ProductMaturityDomain[]
}

export type ProductMaturityBoardSnapshot = ProductMaturityBoard & {
  loadedAt: string
  sourceRelativePath: string
}

const BOARD_RELATIVE_PATH = 'docs/product/PRODUCT_MATURITY_BOARD.json'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseItem(raw: unknown, context: string): ProductMaturityItem {
  if (!isRecord(raw)) throw new Error(`${context}: expected object`)
  const { id, title, maturity, note, doc } = raw
  if (typeof id !== 'string' || !id.trim()) throw new Error(`${context}: invalid id`)
  if (typeof title !== 'string' || !title.trim()) throw new Error(`${context}: invalid title`)
  if (typeof note !== 'string') throw new Error(`${context}: invalid note`)
  if (!PRODUCT_MATURITY_LEVELS.includes(maturity as ProductMaturityLevel)) {
    throw new Error(`${context}: invalid maturity "${String(maturity)}"`)
  }
  if (doc !== undefined && typeof doc !== 'string') {
    throw new Error(`${context}: invalid doc`)
  }
  return {
    id: id.trim(),
    title: title.trim(),
    maturity: maturity as ProductMaturityLevel,
    note,
    ...(doc ? { doc: doc.trim() } : {}),
  }
}

function parseBoard(raw: unknown): ProductMaturityBoard {
  if (!isRecord(raw)) throw new Error('product_maturity_board: root must be object')
  const { updatedAt, summary, surfaces, domains } = raw
  if (typeof updatedAt !== 'string' || !updatedAt.trim()) {
    throw new Error('product_maturity_board: invalid updatedAt')
  }
  if (typeof summary !== 'string') throw new Error('product_maturity_board: invalid summary')
  if (!Array.isArray(surfaces)) throw new Error('product_maturity_board: surfaces must be array')
  if (!Array.isArray(domains)) throw new Error('product_maturity_board: domains must be array')

  return {
    updatedAt: updatedAt.trim(),
    summary,
    surfaces: surfaces.map((s, i) => parseItem(s, `surfaces[${i}]`)),
    domains: domains.map((d, i) => {
      if (!isRecord(d)) throw new Error(`domains[${i}]: expected object`)
      const { id, title, items } = d
      if (typeof id !== 'string' || !id.trim()) throw new Error(`domains[${i}]: invalid id`)
      if (typeof title !== 'string' || !title.trim()) throw new Error(`domains[${i}]: invalid title`)
      if (!Array.isArray(items)) throw new Error(`domains[${i}]: items must be array`)
      return {
        id: id.trim(),
        title: title.trim(),
        items: items.map((item, j) => parseItem(item, `domains[${i}].items[${j}]`)),
      }
    }),
  }
}

export function loadProductMaturityBoard(monorepoRoot: string): ProductMaturityBoardSnapshot {
  const boardPath = resolve(monorepoRoot, BOARD_RELATIVE_PATH)
  const text = readFileSync(boardPath, 'utf8')
  const parsed = parseBoard(JSON.parse(text) as unknown)
  return {
    ...parsed,
    loadedAt: new Date().toISOString(),
    sourceRelativePath: BOARD_RELATIVE_PATH,
  }
}
