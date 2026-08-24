import type { ExamResultItemRepository } from '../../domain/exam-result-item/exam-result-item.repository.js'
import { ExamResultItem, type ExamResultItemProps } from '../../domain/exam-result-item/exam-result-item.entity.js'

export interface MarkerTrendPoint {
  collectedAt: string
  numericValue: number | null
  displayValue: string
  unit: string | null
  status: string
  examId: string
}

export interface MarkerTrendGroup {
  markerName: string
  technicalName?: string
  unit?: string
  /** Faixa de referência do resultado mais recente (ex.: "De 65 a 95 mg/dL"). */
  referenceRange?: string
  /** Limites numéricos derivados da faixa (para desenhar banda no gráfico). */
  refLow?: number
  refHigh?: number
  latestValue: string
  latestStatus: string
  latestCollectedAt: string
  points: MarkerTrendPoint[]
}

export class ExamResultItemService {
  constructor(private readonly repo: ExamResultItemRepository) {}

  async listByPatient(patientId: string, markerName?: string): Promise<ExamResultItem[]> {
    return this.repo.findAll({ patientId, markerName })
  }

  async listByExam(examId: string): Promise<ExamResultItem[]> {
    return this.repo.findAll({ examId })
  }

  async createBatch(propsList: ExamResultItemProps[]): Promise<ExamResultItem[]> {
    const items = propsList.map((p) => ExamResultItem.create(p))
    return this.repo.saveBatch(items)
  }

  async getMarkerTrends(patientId: string): Promise<MarkerTrendGroup[]> {
    const allItems = await this.repo.findAll({ patientId })
    const groupsMap = new Map<string, ExamResultItem[]>()

    for (const item of allItems) {
      const key = item.markerName.trim()
      if (!groupsMap.has(key)) groupsMap.set(key, [])
      groupsMap.get(key)!.push(item)
    }

    const result: MarkerTrendGroup[] = []

    for (const [markerName, items] of groupsMap) {
      items.sort((a, b) => a.collectedAt.getTime() - b.collectedAt.getTime())

      const latest = items[items.length - 1]
      if (!latest) continue

      result.push({
        markerName,
        technicalName: latest.technicalName ?? undefined,
        unit: latest.unit ?? undefined,
        referenceRange: latest.referenceRange ?? undefined,
        ...parseReferenceLimits(latest.referenceRange),
        latestValue: `${latest.displayValue}${latest.unit ? ' ' + latest.unit : ''}`,
        latestStatus: latest.status,
        latestCollectedAt: latest.collectedAt.toISOString().slice(0, 10),
        points: items.map((it) => ({
          collectedAt: it.collectedAt.toISOString().slice(0, 10),
          numericValue: it.numericValue,
          displayValue: it.displayValue,
          unit: it.unit,
          status: it.status,
          examId: it.examId,
        })),
      })
    }

    return result
  }
}

/**
 * Extrai limites numéricos da faixa de referência em português.
 * Formatos suportados: "De X a Y", "X a Y", "Inferior a Z", "Até Z", "Superior a Z".
 * Valores BR (vírgula decimal, ponto de milhar) são normalizados.
 */
export function parseReferenceLimits(ref: string | null | undefined): { refLow?: number; refHigh?: number } {
  if (!ref) return {}
  const clean = (s: string) => {
    const n = Number(s.replace(/\.(?=\d{3}(?!\d))/g, '').replace(',', '.'))
    return Number.isFinite(n) ? n : undefined
  }
  const range = ref.match(/(?:de\s*)?([\d.,]+)\s*(?:a|-|–|até)\s*([\d.,]+)/i)
  if (range) {
    const lo = clean(range[1])
    const hi = clean(range[2])
    if (lo != null && hi != null && lo <= hi) return { refLow: lo, refHigh: hi }
    return {}
  }
  const max = ref.match(/(?:inferior a|até|menor que|limítrofe\s*:?)\s*([\d.,]+)/gi)
  if (max) {
    // Pega o último limite mencionado (ex.: "Até 7 dias: até 15 mcU/mL" → 15)
    const last = max[max.length - 1]
    const hi = clean(last.replace(/^[^:\d]*/, '').match(/([\d.,]+)/)![1])
    if (hi != null) return { refHigh: hi }
  }
  const min = ref.match(/superior a\s*([\d.,]+)/i)
  if (min) {
    const lo = clean(min[1])
    if (lo != null) return { refLow: lo }
  }
  return {}
}
