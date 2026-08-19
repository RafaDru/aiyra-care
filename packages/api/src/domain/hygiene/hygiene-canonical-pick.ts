import type { HygieneEntityType } from './hygiene.types.js'

/** Prioridade de fonte para escolher o registro canônico em same_entity. */
const SOURCE_PRIORITY: Record<string, number> = {
  conectesus: 100,
  caderneta: 90,
  rnds: 85,
  mater_dei: 70,
  hermes_pardini: 70,
  unimed: 60,
  amil: 60,
  bradesco_saude: 60,
  manual: 10,
}

export function sourcePriority(source: string | null | undefined): number {
  if (!source) return 0
  return SOURCE_PRIORITY[source.toLowerCase()] ?? 40
}

export function pickCanonicalEntityPair(
  entityType: HygieneEntityType,
  entityIdA: string,
  entityIdB: string,
  sourceA: string | null | undefined,
  sourceB: string | null | undefined,
): [canonicalId: string, duplicateId: string] {
  const prioA = sourcePriority(sourceA)
  const prioB = sourcePriority(sourceB)
  if (prioA > prioB) return [entityIdA, entityIdB]
  if (prioB > prioA) return [entityIdB, entityIdA]
  // fallback: menor UUID como canônico (estável)
  return entityIdA < entityIdB ? [entityIdA, entityIdB] : [entityIdB, entityIdA]
}
