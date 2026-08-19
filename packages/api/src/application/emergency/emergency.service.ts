import { NotFoundError } from '../../domain/errors.js'
import type { EmergencyRepository } from '../../domain/emergency/emergency.repository.js'
import { PatientEmergencyContact } from '../../domain/emergency/patient-emergency-contact.entity.js'
import type { PatientEmergencyContactProps } from '../../domain/emergency/patient-emergency-contact.entity.js'

export class EmergencyService {
  constructor(private readonly repo: EmergencyRepository) {}

  listDirectory(filter?: Parameters<EmergencyRepository['listDirectory']>[0]) {
    return this.repo.listDirectory(filter)
  }

  listContacts(patientId: string) {
    return this.repo.listContacts({ patientId })
  }

  async createContact(data: PatientEmergencyContactProps) {
    const contact = PatientEmergencyContact.create(data)
    return this.repo.saveContact(contact)
  }

  async findContactById(id: string) {
    const row = await this.repo.findContactById(id)
    if (!row) throw new NotFoundError('PatientEmergencyContact', id)
    return row
  }

  async updateContact(id: string, data: Partial<PatientEmergencyContactProps>) {
    const contact = await this.findContactById(id)
    if (contact.deletedAt) throw new NotFoundError('PatientEmergencyContact', id)
    contact.update(data)
    return this.repo.updateContact(contact)
  }

  async softDeleteContact(id: string, deletedBy?: string | null) {
    const contact = await this.findContactById(id)
    if (contact.deletedAt) return contact
    contact.softDelete(deletedBy)
    return this.repo.updateContact(contact)
  }
}
