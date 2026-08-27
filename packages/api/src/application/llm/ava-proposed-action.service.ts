import { randomUUID } from 'node:crypto'
import type { IntegrationLinkRepository } from '../../domain/integration-link/integration-link.repository.js'
import type { HygieneRepository } from '../../domain/hygiene/hygiene.repository.js'
import type { HygieneService } from '../hygiene/hygiene.service.js'
import type { IntegrationLinkSyncService } from '../integration-link/integration-link-sync.service.js'
import type { IntegrationLink } from '../../domain/integration-link/integration-link.entity.js'
import { isIntegrationLinkSessionReady } from '../integration-link/integration-link-session.js'
import type { AvaActionExecuteInput, AvaProposedAction } from '../../domain/llm/ava-proposed-action.js'
import {
  formatHygieneCandidateDescription,
  shouldOfferHygieneActions,
} from '../../domain/llm/ava-context-aggregate.js'

const SYNC_RE = /\b(sincroniz|sync|integra[cç][aã]o|portal|unimed|amil|mater|hermes|pardini)\b/i
const EXPORT_RE = /\b(export|exportar|pdf|imprimir|compartilhar.*pront[uá]rio|relat[oó]rio cl[ií]nico)\b/i

export class AvaProposedActionService {
  constructor(
    private readonly links: IntegrationLinkRepository,
    private readonly hygieneRepo: HygieneRepository,
    private readonly hygieneService: HygieneService,
    private readonly syncService: IntegrationLinkSyncService,
  ) {}

  async detectProposals(
    accountId: string,
    patientId: string,
    userMessage: string,
    opts?: { recentAssistantText?: string },
  ): Promise<AvaProposedAction[]> {
    const trimmed = userMessage.trim()
    if (!trimmed) return []

    const proposals: AvaProposedAction[] = []

    if (SYNC_RE.test(trimmed)) {
      const links = await this.links.findAllByPatient(patientId)
      const syncable = links.filter((l) => this.isSyncablePortal(l))
      for (const link of syncable.slice(0, 3)) {
        const portal = link.portalType.replace(/_/g, ' ')
        proposals.push({
          id: randomUUID(),
          type: 'integration_sync',
          label: `Sincronizar ${portal}`,
          description: isIntegrationLinkSessionReady(link)
            ? 'Dispara sync no portal (pode abrir progresso na aba Integrações).'
            : 'Exige sessão válida — pode abrir login na aba Integrações.',
          payload: { linkId: link.id, patientId, force: true },
        })
      }
    }

    if (EXPORT_RE.test(trimmed)) {
      proposals.push({
        id: randomUUID(),
        type: 'clinical_export',
        label: 'Abrir exportação clínica',
        description: 'Gera prévia/impressão do prontuário (resumo ou completo).',
        payload: { patientId, mode: 'summary' },
      })
    }

    if (shouldOfferHygieneActions(trimmed, opts?.recentAssistantText)) {
      const pending = await this.hygieneRepo.listForAccount(accountId, {
        status: 'pending',
        patientId,
        limit: 5,
      })
      for (const row of pending.slice(0, 3)) {
        const entityLabel = row.entityType === 'vaccine' ? 'vacina' : row.entityType
        const description = formatHygieneCandidateDescription(
          row.entityType,
          row.evidence ?? {},
          row.detector,
        )
        proposals.push({
          id: randomUUID(),
          type: 'hygiene_merge',
          label: `Unificar ${entityLabel} duplicada`,
          description,
          payload: { candidateId: row.id, decision: 'same_entity' },
        })
      }
      if (pending.length > 0 && proposals.every((p) => p.type !== 'hygiene_dismiss')) {
        proposals.push({
          id: randomUUID(),
          type: 'hygiene_dismiss',
          label: 'Manter registros distintos',
          description: 'Descartar sugestões de duplicata pendentes',
          payload: { candidateId: pending[0].id, decision: 'dismissed' },
        })
      }
    }

    return proposals
  }

  async execute(
    accountId: string,
    resolvedBy: string,
    input: AvaActionExecuteInput,
  ): Promise<{ ok: boolean; message: string; data?: Record<string, unknown> }> {
    switch (input.type) {
      case 'integration_sync': {
        const linkId = String(input.payload.linkId ?? '')
        const link = await this.links.findById(linkId)
        if (!link) throw new Error('AVA_ACTION_LINK_NOT_FOUND')
        const result = await this.syncService.requestSync(link, {
          force: Boolean(input.payload.force),
          trigger: 'manual',
          background: true,
        })
        return {
          ok: true,
          message: result.skipped
            ? `Sync não iniciado (${result.reason ?? 'skipped'})`
            : 'Sincronização iniciada',
          data: { jobId: result.jobId, skipped: result.skipped, reason: result.reason },
        }
      }
      case 'clinical_export': {
        const patientId = String(input.payload.patientId ?? '')
        const mode = input.payload.mode === 'full' ? 'full' : 'summary'
        return {
          ok: true,
          message: 'Use o botão de exportação ou o link retornado',
          data: { patientId, mode, exportPath: `/patients/${patientId}/clinical-export?mode=${mode}` },
        }
      }
      case 'hygiene_merge':
      case 'hygiene_dismiss': {
        const candidateId = String(input.payload.candidateId ?? '')
        const decision = input.type === 'hygiene_merge' ? 'same_entity' : 'dismissed'
        await this.hygieneService.resolve(accountId, candidateId, decision, resolvedBy)
        return { ok: true, message: 'Higienização atualizada' }
      }
      default:
        throw new Error('AVA_ACTION_UNKNOWN')
    }
  }

  private isSyncablePortal(link: IntegrationLink): boolean {
    return ['unimed', 'amil', 'mater_dei', 'hermes_pardini'].includes(link.portalType)
  }
}
