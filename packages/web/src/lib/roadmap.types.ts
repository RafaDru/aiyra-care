export type RoadmapItemStatus = 'done' | 'in_progress' | 'planned' | 'blocked'

export interface RoadmapReviewBadge {
  id: string
  label: string
  color: string
  profession: string
  description?: string
}

export interface RoadmapItem {
  id: string
  title: string
  status: RoadmapItemStatus
  detail?: string
  /** Badge(s) de revisão humana/profissional pendente — ver reviewBadges no roadmap. */
  reviewBadge?: string | string[]
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
  reviewBadge?: string | string[]
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
  reviewBadges?: RoadmapReviewBadge[]
  priorities: RoadmapPriority[]
  categories?: RoadmapCategory[]
  principles: string[]
  epics: RoadmapEpic[]
}

export interface HumanReviewQueueEntry {
  epicId: string
  epicTitle: string
  item: RoadmapItem
  badges: string[]
}
