import type { EmergencyDirectoryEntry } from './emergency-directory.types.js'
import type { PatientEmergencyContact } from './patient-emergency-contact.entity.js'

export type EmergencyDirectoryFilter = {
  category?: string
  scope?: string
  stateCode?: string
}

export type PatientEmergencyContactFilter = {
  patientId?: string
  includeDeleted?: boolean
}

export interface EmergencyRepository {
  listDirectory(filter?: EmergencyDirectoryFilter): Promise<EmergencyDirectoryEntry[]>
  findContactById(id: string): Promise<PatientEmergencyContact | null>
  listContacts(filter?: PatientEmergencyContactFilter): Promise<PatientEmergencyContact[]>
  saveContact(contact: PatientEmergencyContact): Promise<PatientEmergencyContact>
  updateContact(contact: PatientEmergencyContact): Promise<PatientEmergencyContact>
}
