import type { AuthorizationItem } from './authorization-item.entity.js'

export interface AuthorizationItemRepository {
  findByAuthorizationId(authorizationId: string): Promise<AuthorizationItem[]>
  replaceForAuthorization(authorizationId: string, items: AuthorizationItem[]): Promise<AuthorizationItem[]>
  deleteByAuthorizationId(authorizationId: string): Promise<void>
}
