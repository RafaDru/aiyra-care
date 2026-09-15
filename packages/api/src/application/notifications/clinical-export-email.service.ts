import type { TransactionalEmailPort } from '../../domain/notifications/transactional-email.types.js'
import { createTransactionalEmailAdapter } from '../../infrastructure/notifications/resend-transactional-email.adapter.js'

export interface ClinicalExportDoctorEmailInput {
  recipientEmail: string
  doctorName?: string | null
  patientName: string
  caregiverLabel?: string | null
  shareUrl: string
  expiresAt: string
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildClinicalExportDoctorEmail(input: ClinicalExportDoctorEmailInput) {
  const doctor = input.doctorName?.trim() || 'Doutor(a)'
  const caregiver = input.caregiverLabel?.trim() || 'O cuidador'
  const expires = new Date(input.expiresAt).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
  const subject = `Resumo de saúde — consulta (${input.patientName})`
  const text = [
    `Olá, ${doctor},`,
    ``,
    `${caregiver} preparou um resumo de saúde de ${input.patientName} para apoiar a consulta.`,
    ``,
    `Abra o link seguro (válido até ${expires}):`,
    input.shareUrl,
    ``,
    `O documento foi gerado pelo cuidador no AiyraCare e não substitui o prontuário oficial.`,
    `Se você não esperava este e-mail, ignore-o.`,
    ``,
    `— AiyraCare`,
  ].join('\n')
  const html = `<p>Olá, ${escapeHtml(doctor)},</p>
<p><strong>${escapeHtml(caregiver)}</strong> preparou um resumo de saúde de <strong>${escapeHtml(input.patientName)}</strong> para apoiar a consulta.</p>
<p><a href="${escapeHtml(input.shareUrl)}">Abrir resumo de saúde</a></p>
<p style="font-size:12px;color:#666;">Link válido até ${escapeHtml(expires)}. Documento gerado pelo cuidador — não substitui prontuário oficial.</p>
<p style="font-size:12px;color:#666;">Se você não esperava este e-mail, ignore-o.</p>`
  return { subject, text, html }
}

export class ClinicalExportEmailService {
  constructor(private readonly mailer: TransactionalEmailPort = createTransactionalEmailAdapter()) {}

  async sendToDoctor(input: ClinicalExportDoctorEmailInput) {
    const body = buildClinicalExportDoctorEmail(input)
    return this.mailer.send({
      to: input.recipientEmail,
      subject: body.subject,
      text: body.text,
      html: body.html,
    })
  }
}

export function dispatchClinicalExportEmail(
  task: () => Promise<unknown>,
  log?: { warn: (msg: string) => void },
) {
  void task().catch((err) => {
    const msg = err instanceof Error ? err.message : String(err)
    log?.warn(`clinical export email failed: ${msg}`)
  })
}
