import { describe, expect, it } from 'vitest'
import {
  buildCaregiverInviteEmail,
  buildProfileShareInviteEmail,
} from '../src/application/notifications/family-access-email.service.js'

describe('family-access-email templates', () => {
  it('monta convite de cuidador com link de aceite', () => {
    const { subject, text } = buildCaregiverInviteEmail({
      inviteeEmail: 'maria@example.com',
      inviterDisplayName: 'João',
      patientNames: ['Pedro', 'Lucas'],
      circleName: 'Família A',
      acceptUrl: 'https://app.example/invite/accept?token=abc',
    })
    expect(subject).toContain('João')
    expect(text).toContain('Pedro, Lucas')
    expect(text).toContain('invite/accept?token=abc')
    expect(text).toContain('maria@example.com')
  })

  it('monta convite de compartilhamento entre famílias', () => {
    const { subject, text } = buildProfileShareInviteEmail({
      targetEmail: 'francisco@example.com',
      ownerDisplayName: 'João',
      patientName: 'Mariana',
      settingsUrl: 'https://app.example/settings/family',
    })
    expect(subject).toContain('Mariana')
    expect(text).toContain('settings/family')
    expect(text).toContain('João')
  })
})
