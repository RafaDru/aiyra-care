export type RoadmapItemStatus = 'done' | 'in_progress' | 'planned' | 'blocked'

export interface RoadmapItem {
  id: string
  title: string
  status: RoadmapItemStatus
  detail?: string
}

export interface RoadmapEpic {
  id: string
  priority: string
  /** Categoria de produto/negócio vs técnico — ver categories no roadmap. */
  category?: string
  title: string
  summary: string
  status: RoadmapItemStatus
  statusLabel?: string
  items: RoadmapItem[]
}

export interface RoadmapCategory {
  id: string
  label: string
  color: string
  description: string
}

export interface RoadmapPriority {
  id: string
  label: string
  color: string
  description: string
}

export interface RoadmapData {
  schemaVersion: number
  updatedAt: string
  title: string
  intro: string
  priorities: RoadmapPriority[]
  categories?: RoadmapCategory[]
  principles: string[]
  epics: RoadmapEpic[]
}
