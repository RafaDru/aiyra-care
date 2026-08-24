import type { FamilySupportBundle } from '../../domain/family-support/family-support.types.js'
import type { LlmRouter } from '../../infrastructure/llm/llm-router.js'
import type { LlmQuotaService } from './llm-quota.service.js'
import type { LlmMessage, LlmTier, LlmTokenUsage, LlmUsageQuota } from '../../domain/llm/llm.types.js'
import {
  isAvaLlmEnabled,
  avaReserveOutputTokens,
  estimateCompletionReserve,
} from '../../domain/llm/llm-policy.js'
import {
  AVA_CRITIQUE_SYSTEM,
  buildCritiqueUserPrompt,
  buildRevisionMessages,
  combineReflectionOutcome,
  estimateAvaTurnTokenReserve,
  isAvaReflectionEnabled,
  avaReflectionMaxRevisions,
  mergeTokenUsages,
  parseAvaCritiqueJson,
  validateAvaReplyDeterministic,
  type AvaCritiqueResult,
  type AvaReflectionOutcome,
} from '../../domain/llm/ava-reflection.js'

const AVA_SYSTEM_BASE = `Você é Ava, agente virtual de apoio familiar do AiyraCare.
Regras obrigatórias:
- Não diagnostique. Use linguagem de apoio: "vale conversar com o {clinician} sobre…", "emergência: SAMU 192".
- Use APENAS os dados do prontuário fornecidos abaixo. Se um exame não está listado, diga que não há registro no prontuário — não diga que "não tem acesso".
- Ao perguntar sobre exames (ex.: hemograma), cite data, laboratório e resumo do prontuário quando existir; organize para a conversa com o {clinician}.
- Não prescreva doses nem instrua medicamentos sem orientação médica explícita no contexto.
- Não repita saudações genéricas se a conversa já está em andamento — responda direto ao que foi perguntado.
- Seja empática e clara, com detalhe útil (não respostas de uma linha). Português do Brasil.
Formato das respostas (renderizamos markdown):
- Compare múltiplos exames/marcadores/datas usando TABELAS markdown (| coluna | coluna |) — nunca listas longas de números soltos.
- Use **negrito** para valores alterados ou alertas; destaque datas importantes.
- Estruture respostas longas com subtítulos curtos (### ) e listas numeradas para passos.
- Emojis só quando trouxerem acolhimento genuíno (máx. 1 por resposta).`

export function buildAvaSystemPrompt(clinicianLabel: string): string {
  return AVA_SYSTEM_BASE.replace(/\{clinician\}/g, clinicianLabel)
}

export interface AvaChatResult {
  reply: string
  provider: string
  model: string
  tier: LlmTier
  usage: { tokensIn: number; tokensOut: number; tokensTotal: number; usageSource: string }
  quota: LlmUsageQuota
  disclaimer: string
  insightsIncluded: number
  reflection: AvaReflectionOutcome
}

export class AvaOrchestratorService {
  constructor(
    private readonly quota: LlmQuotaService,
    private readonly router: LlmRouter,
  ) {}

  async chat(input: {
    scopeId: string
    accountId?: string
    patientId: string
    message: string
    bundle: FamilySupportBundle
    patientContextBlock: string
    clinicianLabel: string
    ageCategory: string
    healthThreadId?: string
    tier?: LlmTier
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
    allowLlmDataSharing?: boolean
  }): Promise<AvaChatResult> {
    if (!isAvaLlmEnabled()) throw new Error('AVA_LLM_DISABLED')

    const trimmed = input.message.trim()
    if (!trimmed) throw new Error('Mensagem vazia')

    const insightBlock = input.bundle.insights.length
      ? input.bundle.insights.map((i) => `[${i.priority}] ${i.title}: ${i.message}`).join('\n')
      : 'Sem alertas determinísticos no momento.'

    const contextUser = `PRONTUÁRIO DO PACIENTE (fonte autorizada — use estes dados):
${input.patientContextBlock}

ALERTAS AUTOMÁTICOS:
${insightBlock}

Mensagem atual do responsável: ${trimmed}`

    const reflectionOpts = {
      clinicianLabel: input.clinicianLabel,
      ageCategory: input.ageCategory,
    }

    const historyMessages: LlmMessage[] = (input.history ?? [])
      .slice(-8)
      .map((h) => ({ role: h.role, content: h.content }))

    const baseMessages: LlmMessage[] = [
      { role: 'system', content: buildAvaSystemPrompt(input.clinicianLabel) },
      ...historyMessages,
      { role: 'user', content: contextUser },
    ]

    const quotaPreview = await this.quota.getQuota(input.scopeId)
    const tier: LlmTier = input.tier
      ?? (quotaPreview.handwritingCredits.monthlyFreeRemaining > 0 ? 'free' : 'premium')

    const baseReserve = estimateCompletionReserve(baseMessages, avaReserveOutputTokens())
    const reserve = estimateAvaTurnTokenReserve(baseReserve)
    await this.quota.assertCanSpend(input.scopeId, reserve)

    const usages: LlmTokenUsage[] = []
    const steps: string[] = ['prontuário e alertas aplicados']
    let provider = 'ava-orchestrator'
    let model = 'n/a'
    let attempts = 0

    const routerOpts = { allowLlmDataSharing: input.allowLlmDataSharing ?? false }

    attempts += 1
    steps.push('resposta inicial')
    let draft = await this.router.completeChat(baseMessages, tier, routerOpts)
    usages.push(draft.usage)
    provider = draft.provider
    model = draft.model
    let reply = draft.text

    let revised = false
    let deterministic = validateAvaReplyDeterministic(reply, input.bundle.insights, trimmed, reflectionOpts)
    let critique = null

    if (isAvaReflectionEnabled()) {
      if (deterministic.severity !== 'critical' && deterministic.issues.length === 0) {
        steps.push('verificação por regras ok')
        const critiqueMessages: LlmMessage[] = [
          { role: 'system', content: AVA_CRITIQUE_SYSTEM },
          {
            role: 'user',
            content: buildCritiqueUserPrompt(
              trimmed,
              `${input.patientContextBlock}\n\nAlertas:\n${insightBlock}`,
              reply,
              deterministic.issues,
            ),
          },
        ]
        attempts += 1
        steps.push('crítica de qualidade')
        const critiqueCompletion = await this.router.completeJson(critiqueMessages, tier, routerOpts)
        usages.push(critiqueCompletion.usage)
        critique = parseAvaCritiqueJson(critiqueCompletion.text)
        if (!critique) {
          const fallback: AvaCritiqueResult = { satisfactory: true, issues: [], severity: 'ok' }
          critique = fallback
          steps.push('crítica LLM inválida — mantida resposta')
        }
      } else {
        steps.push('regras detectaram problemas — revisão direta')
        critique = {
          satisfactory: false,
          issues: deterministic.issues,
          severity: deterministic.severity,
        }
      }

      const needsRevision = !critique.satisfactory
        && critique.severity !== 'ok'
        && avaReflectionMaxRevisions() > 0

      if (needsRevision) {
        const revisionMessages = buildRevisionMessages(
          baseMessages,
          [...deterministic.issues, ...critique.issues],
        )
        attempts += 1
        revised = true
        steps.push('revisão da resposta')
        const revision = await this.router.completeChat(revisionMessages, tier, routerOpts)
        usages.push(revision.usage)
        provider = revision.provider
        model = revision.model
        reply = revision.text
        deterministic = validateAvaReplyDeterministic(reply, input.bundle.insights, trimmed, reflectionOpts)
      }
    }

    const reflection = combineReflectionOutcome(deterministic, critique, revised, attempts, steps)
    const mergedUsage = mergeTokenUsages(usages)

    const quota = await this.quota.recordUsage(input.scopeId, {
      accountId: input.accountId,
      feature: 'ava_chat',
      patientId: input.patientId,
      provider,
      model,
      tier,
      usage: mergedUsage,
      metadata: {
        healthThreadId: input.healthThreadId ?? null,
        reflection: {
          satisfactory: reflection.satisfactory,
          revised: reflection.revised,
          attempts: reflection.attempts,
          severity: reflection.severity,
          issueCount: reflection.issues.length,
        },
        llmCalls: usages.length,
      },
    })

    return {
      reply,
      provider,
      model,
      tier,
      usage: mergedUsage,
      quota,
      disclaimer: input.bundle.disclaimer,
      insightsIncluded: input.bundle.insights.length,
      reflection,
    }
  }
}
