import type { CarePlaceRepository } from '../../domain/care-place/care-place.repository.js'

export function normalizeCarePlaceName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
}

export class CarePlaceService {
  constructor(private readonly repo: CarePlaceRepository) {}

  async search(query: string, limit = 20) {
    return this.repo.search(query.trim(), limit)
  }

  async recordUsage(name: string | undefined | null): Promise<void> {
    const display = name?.trim()
    if (!display || display.length < 2) return
    const normalized = normalizeCarePlaceName(display)
    if (!normalized) return
    await this.repo.upsert(display, normalized)
  }
}
