export interface CarePlaceRow {
  id: string
  displayName: string
  normalizedName: string
  usageCount: number
  firstSeenAt: Date
  lastUsedAt: Date
}

export interface CarePlaceRepository {
  search(query: string, limit?: number): Promise<CarePlaceRow[]>
  upsert(displayName: string, normalizedName: string): Promise<CarePlaceRow>
}
