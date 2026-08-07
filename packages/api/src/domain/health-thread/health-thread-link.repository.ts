import type { HealthThreadLink } from './health-thread-link.entity.js'

export interface HealthThreadLinkRepository {
  findByThreadId(threadId: string): Promise<HealthThreadLink[]>
  save(link: HealthThreadLink): Promise<HealthThreadLink>
  findByThreadAndEntity(
    threadId: string,
    entityType: string,
    entityId: string,
  ): Promise<HealthThreadLink | null>
}
