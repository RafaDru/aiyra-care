import type { TransactionalEmailPort } from '../../domain/notifications/transactional-email.types.js'
import { createTransactionalEmailAdapter } from '../../infrastructure/notifications/resend-transactional-email.adapter.js'

export interface CaregiverInviteEmailInput {
  inviteeEmail: string
  inviterDisplayName: string | null
  patientNames: string[]
  circleName: string | null
  acceptUrl: string
}

export interface ProfileShareInviteEmailInput {
  targetEmail: string
  ownerDisplayName: string | null
  patientName: string
  settingsUrl: string
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildCaregiverInviteEmail(input: CaregiverInviteEmailInput) {
  const inviter = input.inviterDisplayName?.trim() || 'Um cuidador no AiyraCare'
  const profiles = input.patientNames.join(', ')
  const family = input.circleName ? ` na família «${input.circleName}»` : ''
  const subject = `${inviter} convidou você para cuidar de perfis de saúde`
  const text = [
    `Olá,`,
    ``,
    `${inviter} convidou você para acessar perfis de saúde${family}: ${profiles}.`,
    ``,
    `Aceite o convite com o mesmo e-mail indicado (${input.inviteeEmail}):`,
    input.acceptUrl,
    ``,
    `Se você não esperava este convite, ignore este e-mail.`,
    ``,
    `— AiyraCare`,
  ].join('\n')
  const html = `<p>Olá,</p>
<p><strong>${escapeHtml(inviter)}</strong> convidou você para acessar perfis de saúde${family ? ` na família <strong>${escapeHtml(input.circleName!)}</strong>` : ''}: <strong>${escapeHtml(profiles)}</strong>.</p>
<p><a href="${escapeHtml(input.acceptUrl)}">Aceitar convite</a></p>
<p>Use o e-mail <strong>${escapeHtml(input.inviteeEmail)}</strong> ao entrar.</p>
<p>Se você não esperava este convite, ignore este e-mail.</p>`
  return { subject, text, html }
}

export function buildProfileShareInviteEmail(input: ProfileShareInviteEmailInput) {
  const owner = input.ownerDisplayName?.trim() || 'O titular do perfil'
  const subject = `${owner} quer compartilhar o perfil de ${input.patientName} com sua família`
  const text = [
    `Olá,`,
    ``,
    `${owner} convidou você a vincular o perfil de saúde «${input.patientName}» a uma família na sua conta AiyraCare.`,
    ``,
    `Entre em Configurações → Família e cuidadores para aceitar:`,
    input.settingsUrl,
    ``,
    `Depois do vínculo, conceda acesso apenas aos cuidadores necessários.`,
    ``,
    `— AiyraCare`,
  ].join('\n')
  const html = `<p>Olá,</p>
<p><strong>${escapeHtml(owner)}</strong> convidou você a vincular o perfil <strong>${escapeHtml(input.patientName)}</strong> a uma família na sua conta.</p>
<p><a href="${escapeHtml(input.settingsUrl)}">Abrir Configurações → Família</a></p>
<p>Depois do vínculo, conceda acesso apenas aos cuidadores necessários.</p>`
  return { subject, text, html }
}

export class FamilyAccessEmailService {
  constructor(private readonly mailer: TransactionalEmailPort = createTransactionalEmailAdapter()) {}

  async sendCaregiverInvite(input: CaregiverInviteEmailInput) {
    const body = buildCaregiverInviteEmail(input)
    return this.mailer.send({
      to: input.inviteeEmail,
      subject: body.subject,
      text: body.text,
      html: body.html,
    })
  }

  async sendProfileShareInvite(input: ProfileShareInviteEmailInput) {
    const body = buildProfileShareInviteEmail(input)
    return this.mailer.send({
      to: input.targetEmail,
      subject: body.subject,
      text: body.text,
      html: body.html,
    })
  }
}

export function dispatchFamilyAccessEmail(
  task: () => Promise<unknown>,
  log?: { warn: (msg: string) => void },
) {
  void task().catch((err) => {
    const msg = err instanceof Error ? err.message : String(err)
    log?.warn(`family access email failed: ${msg}`)
  })
}
