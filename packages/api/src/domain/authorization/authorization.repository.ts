import type { Authorization } from './authorization.entity.js'

export type AuthorizationFilter = { patientId?: string | string[]; status?: string }

export interface AuthorizationRepository {
  findById(id: string): Promise<Authorization | null>
  findAll(filter?: AuthorizationFilter): Promise<Authorization[]>
  save(auth: Authorization): Promise<Authorization>
  update(auth: Authorization): Promise<Authorization>
  delete(id: string): Promise<void>
}
