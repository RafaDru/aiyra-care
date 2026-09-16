import { describe, expect, it } from 'vitest'
import { buildClinicalExportDoctorEmail } from '../src/application/notifications/clinical-export-email.service.js'

describe('clinical-export-email templates', () => {
  it('monta e-mail ao médico com link e validade', () => {
    const { subject, text, html } = buildClinicalExportDoctorEmail({
      recipientEmail: 'medico@clinica.com.br',
      doctorName: 'Dr. Silva',
      patientName: 'Maria Souza',
      caregiverLabel: 'João',
      shareUrl: 'https://app.example/clinical-export/tok?ref=ABC12345',
      expiresAt: '2026-09-16T12:00:00.000Z',
    })

    expect(subject).toContain('Maria Souza')
    expect(text).toContain('Dr. Silva')
    expect(text).toContain('João')
    expect(text).toContain('clinical-export/tok?ref=ABC12345')
    expect(text).toContain('não substitui o prontuário oficial')
    expect(html).toContain('Maria Souza')
    expect(html).toContain('clinical-export/tok?ref=ABC12345')
  })

  it('usa saudação genérica sem nome do médico', () => {
    const { text } = buildClinicalExportDoctorEmail({
      recipientEmail: 'medico@clinica.com.br',
      patientName: 'Pedro',
      shareUrl: 'https://app.example/clinical-export/tok',
      expiresAt: '2026-09-16T12:00:00.000Z',
    })
    expect(text).toContain('Doutor(a)')
    expect(text).toContain('O cuidador')
  })
})
