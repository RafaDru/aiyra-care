/** Adapter do lookup de catálogo usando distância por edição (fuzzy).
 *  Implementa o port `ExamCatalogLookup` do domínio. Sem dependência externa
 *  pesada: usa jaroWinkler (edit distance) local, suficiente para rótulos curtos
 *  de operadora. Trocável por outro motor (Ex.: models de embedding) sem afetar o domínio.
 */
import { jaroWinkler } from '@nlptools/distance'
import {
  EXAM_CATALOG,
  type CatalogEntry,
  type ExamCatalogLookup,
} from '../../domain/classification/exam-catalog.js'
import { normalizeHealthLabel } from '../../domain/classification/label-classification.js'

/** Índice de lookup pré-computado (labels normalizados -> entries + fuzzables). */
const ALIAS_INDEX = new Map<string, { entry: CatalogEntry; exact: boolean }>()
const FUZZY_POOL: Array<{ label: string; entry: CatalogEntry }> = []

function buildIndex(): void {
  for (const entry of EXAM_CATALOG) {
    for (const alias of entry.aliases) {
      const norm = normalizeHealthLabel(alias)
      if (norm) ALIAS_INDEX.set(norm, { entry, exact: true })
    }
    const fuzzySet = entry.fuzzables?.length ? entry.fuzzables : entry.aliases
    for (const f of fuzzySet) {
      const norm = normalizeHealthLabel(f)
      if (norm) FUZZY_POOL.push({ label: norm, entry })
    }
  }
}

buildIndex()

export class FuzzyExamCatalogLookup implements ExamCatalogLookup {
  byAlias(rawLabel: string): { entry: CatalogEntry; method: 'exact' | 'synonym' | 'acronym' } | null {
    const norm = normalizeHealthLabel(rawLabel)
    if (!norm) return null
    const hit = ALIAS_INDEX.get(norm)
    if (hit) return { entry: hit.entry, method: 'exact' }
    // Tenta remover espaços (siglas compostas, ex.: 'SARS COV 2' == 'SARSCOV2')
    const compact = norm.replace(/\s+/g, '')
    for (const [alias, { entry }] of ALIAS_INDEX) {
      if (alias.replace(/\s+/g, '') === compact) return { entry, method: 'acronym' }
    }
    return null
  }

  bestFuzzy(
    rawLabel: string,
    threshold: number,
  ): { entry: CatalogEntry; similarity: number; distance: number } | null {
    const norm = normalizeHealthLabel(rawLabel)
    if (!norm) return null
    let best: { entry: CatalogEntry; similarity: number } | null = null
    for (const { label, entry } of FUZZY_POOL) {
      const sim = jaroWinkler(norm, label)
      if (sim >= threshold && (!best || sim > best.similarity)) {
        best = { entry, similarity: sim }
      }
    }
    if (!best) return null
    return { entry: best.entry, similarity: best.similarity, distance: 1 - best.similarity }
  }
}
