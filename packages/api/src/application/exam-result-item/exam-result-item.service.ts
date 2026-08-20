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
