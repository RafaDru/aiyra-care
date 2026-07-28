import type { IntegrationLink } from './integration-link.entity.js'

export interface IntegrationLinkRepository {
  findById(id: string): Promise<IntegrationLink | null>
  findByPatientAndPortal(patientId: string, portalType: string): Promise<IntegrationLink | null>
  findAllByPatient(patientId: string): Promise<IntegrationLink[]>
  save(link: IntegrationLink): Promise<IntegrationLink>
  update(link: IntegrationLink): Promise<IntegrationLink>
  delete(id: string): Promise<void>
}
