/**
 * Motor de Embeddings Vetoriais e Similaridade de Cosseno (Term Frequency / N-Gram Vectorizer).
 * Computa o grau de similaridade vetorial e pontuação de confiança em [0.0, 1.0]
 * sem dependências externas pesadas.
 */

import { jaroWinkler } from '@nlptools/distance'
import { normalizeHealthLabel } from '../classification/label-classification.js'
import type { SemanticCatalogEntry } from './semantic-classification.types.js'

export type TermVector = Map<string, number>

/** Converte uma string normalizada em vetor de frequências de termos e n-grams de caracteres. */
export function computeVectorEmbedding(text: string): { vector: TermVector; norm: number } {
  const normText = normalizeHealthLabel(text)
  const vector: TermVector = new Map()

  if (!normText) return { vector, norm: 0 }

  // 1. Unigramas de palavras
  const words = normText.split(/\s+/).filter(Boolean)
  for (const w of words) {
    vector.set(`w:${w}`, (vector.get(`w:${w}`) ?? 0) + 1.5)
  }

  // 2. Trigramas de caracteres para capturar variações morfológicas / erros de digitação / TUSS
  const compact = normText.replace(/\s+/g, ' ')
  for (let i = 0; i <= compact.length - 3; i++) {
    const gram = `g:${compact.slice(i, i + 3)}`
    vector.set(gram, (vector.get(gram) ?? 0) + 1.0)
  }

  // Computa a norma L2 do vetor: ||V|| = sqrt(sum(v_i^2))
  let sumSq = 0
  for (const val of vector.values()) {
    sumSq += val * val
  }
  const norm = Math.sqrt(sumSq)

  return { vector, norm }
}

/** Computa a Similaridade de Cosseno entre dois vetores: (A . B) / (||A|| * ||B||). */
export function cosineSimilarity(
  a: { vector: TermVector; norm: number },
  b: { vector: TermVector; norm: number },
): number {
  if (a.norm === 0 || b.norm === 0) return 0.0

  let dotProduct = 0
  const [smaller, larger] = a.vector.size < b.vector.size ? [a.vector, b.vector] : [b.vector, a.vector]

  for (const [key, valA] of smaller) {
    const valB = larger.get(key)
    if (valB !== undefined) {
      dotProduct += valA * valB
    }
  }

  const sim = dotProduct / (a.norm * b.norm)
  return Math.min(1.0, Math.max(0.0, sim))
}

/**
 * Interface estendida do resultado de busca vetorial contendo o grau de confiança.
 */
export interface VectorMatchResult<TKind = string, TDest = string> {
  entry: SemanticCatalogEntry<TKind, TDest>
  matchedAlias: string
  /** Similaridade vetorial combinada (Cosseno + JaroWinkler) em [0.0, 1.0]. */
  similarity: number
  /** Score de confiança formal. */
  confidence: number
}

/**
 * Busca a melhor correspondência vetorial para um rótulo bruto em relação a um catálogo de entradas.
 */
export function findBestVectorMatch<TKind = string, TDest = string>(
  rawLabel: string,
  catalog: Array<SemanticCatalogEntry<TKind, TDest>>,
  options?: { minThreshold?: number },
): VectorMatchResult<TKind, TDest> | null {
  const normTarget = normalizeHealthLabel(rawLabel)
  if (!normTarget) return null

  const targetEmb = computeVectorEmbedding(normTarget)
  const minThreshold = options?.minThreshold ?? 0.70

  let best: VectorMatchResult<TKind, TDest> | null = null

  for (const entry of catalog) {
    for (const alias of entry.aliases) {
      const normAlias = normalizeHealthLabel(alias)
      if (!normAlias) continue

      // Se for match exato no alias
      if (normTarget === normAlias) {
        return {
          entry,
          matchedAlias: alias,
          similarity: 1.0,
          confidence: 1.0,
        }
      }

      // Cosseno vetorial
      const aliasEmb = computeVectorEmbedding(normAlias)
      const cosSim = cosineSimilarity(targetEmb, aliasEmb)

      // Jaro-Winkler complementar
      const jwSim = jaroWinkler(normTarget, normAlias)

      // Média ponderada (60% cosseno vetorial + 40% Jaro-Winkler)
      const combinedScore = Number((cosSim * 0.6 + jwSim * 0.4).toFixed(3))

      if (combinedScore >= minThreshold && (!best || combinedScore > best.confidence)) {
        best = {
          entry,
          matchedAlias: alias,
          similarity: combinedScore,
          confidence: combinedScore,
        }
      }
    }
  }

  return best
}
