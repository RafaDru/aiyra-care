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
import type { AvaActivityEmitter, AvaActivityEvent } from '../../domain/llm/ava-activity.js'
import { emitAvaActivity } from '../../domain/llm/ava-activity.js'

const AVA_SYSTEM_BASE = `Você é Ava, agente virtual de apoio familiar do AiyraCare.
Regras obrigatórias:
- Não diagnostique. Use linguagem de apoio: "vale conversar com o {clinician} sobre…", "emergência: SAMU 192".
- Use APENAS os dados do prontuário fornecidos abaixo. Se um exame não está listado, diga que não há registro no prontuário — não diga que "não tem acesso".
- Ao perguntar sobre exames (ex.: hemograma), cite data, laboratório e resumo do prontuário quando existir; organize para a conversa com o {clinician}.
- Não prescreva doses nem instrua medicamentos sem orientação médica explícita no contexto.
- Não repita saudações genéricas se a conversa já está em andamento — responda direto ao que foi perguntado.
- Use o histórico da conversa: medicamentos, sintomas, planos de acompanhamento e detalhes citados pelo responsável contam como contexto — mesmo se ainda não constam formalmente no prontuário PG.
- Seja empática e clara, com detalhe útil (não respostas de uma linha). Português do Brasil.
Formato das respostas (renderizamos markdown):
- Compare múltiplos exames/marcadores/datas usando TABELAS markdown (| coluna | coluna |) — nunca listas longas de números soltos.
- Para tendências com 2+ pontos numéricos, pode usar bloco de código com linguagem chart e JSON: {"type":"line"|"bar","title":"...","unit":"...","refLow":n,"refHigh":n,"series":[{"label":"...","value":n,"date":"YYYY-MM-DD"}]}.
- Use **negrito** para valores alterados ou alertas; destaque datas importantes.
- Estruture respostas longas com subtítulos curtos (### ) e listas numeradas para passos.
- Emojis só quando trouxerem acolhimento genuíno (máx. 1 por resposta).
- Para navegar no app, use links markdown com os caminhos do bloco NAVEGAÇÃO (ex.: [Ver exames](/patients/...?section=clinical&tab=exams)).
- Status de integrações/sync: use só o bloco INTEGRAÇÕES — não invente datas. Se o responsável pedir sincronizar/exportar/unificar duplicatas, indique os botões G3 abaixo (unificar vacina/exame duplicado com confirmação).`

export function buildAvaSystemPrompt(
  clinicianLabel: string,
  caregiverFirstName?: string | null,
): string {
  let prompt = AVA_SYSTEM_BASE.replace(/\{clinician\}/g, clinicianLabel)
  if (caregiverFirstName?.trim()) {
    prompt += `\n- O cuidador/responsável é **${caregiverFirstName.trim()}**. Use o primeiro nome com calor e naturalidade quando fizer sentido — sem repetir em toda frase e sem soar artificial.`
  }
  return prompt
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
  activityTrace: AvaActivityEvent[]
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
    entityPinBlock?: string
    operationalBlock?: string
    attachmentBlock?: string
    conversationId?: string
    caregiverFirstName?: string | null
    quotaContext?: { email?: string | null }
  }, activityEmitter?: AvaActivityEmitter): Promise<AvaChatResult> {
    if (!isAvaLlmEnabled()) throw new Error('AVA_LLM_DISABLED')

    const trimmed = input.message.trim()
    if (!trimmed) throw new Error('Mensagem vazia')

    const insightBlock = input.bundle.insights.length
      ? input.bundle.insights.map((i) => `[${i.priority}] ${i.title}: ${i.message}`).join('\n')
      : 'Sem alertas determinísticos no momento.'

    const contextUser = `PRONTUÁRIO DO PACIENTE (fonte autorizada — use estes dados):
${input.patientContextBlock}
${input.entityPinBlock ? `\nREGISTRO EM FOCO (priorize este registro na resposta):\n${input.entityPinBlock}\n` : ''}
${input.operationalBlock ? `\n${input.operationalBlock}\n` : ''}
${input.attachmentBlock ? `\n${input.attachmentBlock}\n` : ''}
ALERTAS AUTOMÁTICOS:
${insightBlock}

Mensagem atual do responsável: ${trimmed}`

    const reflectionOpts = {
      clinicianLabel: input.clinicianLabel,
      ageCategory: input.ageCategory,
    }

    const historyMessages: LlmMessage[] = (input.history ?? [])
      .slice(-12)
      .map((h) => ({ role: h.role, content: h.content }))

    const baseMessages: LlmMessage[] = [
      { role: 'system', content: buildAvaSystemPrompt(input.clinicianLabel, input.caregiverFirstName) },
      ...historyMessages,
      { role: 'user', content: contextUser },
    ]

    const quotaPreview = await this.quota.getQuota(input.scopeId, input.quotaContext)
    const tier: LlmTier = input.tier
      ?? (quotaPreview.handwritingCredits.monthlyFreeRemaining > 0 ? 'free' : 'premium')

    const baseReserve = estimateCompletionReserve(baseMessages, avaReserveOutputTokens())
    const reserve = estimateAvaTurnTokenReserve(baseReserve)
    await this.quota.assertCanSpend(input.scopeId, reserve, input.quotaContext)

    const usages: LlmTokenUsage[] = []
    const activityTrace: AvaActivityEvent[] = []
    const pushActivity = (ev: AvaActivityEvent) => activityTrace.push(ev)
    const emit = (code: import('../../domain/llm/ava-activity.js').AvaActivityCode, kind: 'llm' | 'reflection', status: 'start' | 'done' | 'skip') =>
      pushActivity(emitAvaActivity(activityEmitter, code, kind, status))

    const steps: string[] = ['prontuário e alertas aplicados']
    let provider = 'ava-orchestrator'
    let model = 'n/a'
    let attempts = 0

    const routerOpts = { allowLlmDataSharing: input.allowLlmDataSharing ?? false }

    attempts += 1
    steps.push('resposta inicial')
    emit('llm.initial_reply', 'llm', 'start')
    let draft = await this.router.completeChat(baseMessages, tier, routerOpts)
    emit('llm.initial_reply', 'llm', 'done')
    usages.push(draft.usage)
    provider = draft.provider
    model = draft.model
    let reply = draft.text

    let revised = false
    let deterministic = validateAvaReplyDeterministic(reply, input.bundle.insights, trimmed, reflectionOpts)
    let critique = null

    if (isAvaReflectionEnabled()) {
      emit('reflection.rules_check', 'reflection', 'start')
      if (deterministic.severity !== 'critical' && deterministic.issues.length === 0) {
        steps.push('verificação por regras ok')
        emit('reflection.rules_ok', 'reflection', 'done')
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
        emit('reflection.quality_critique', 'reflection', 'start')
        const critiqueCompletion = await this.router.completeJson(critiqueMessages, tier, routerOpts)
        emit('reflection.quality_critique', 'reflection', 'done')
        usages.push(critiqueCompletion.usage)
        critique = parseAvaCritiqueJson(critiqueCompletion.text)
        if (!critique) {
          const fallback: AvaCritiqueResult = { satisfactory: true, issues: [], severity: 'ok' }
          critique = fallback
          steps.push('crítica LLM inválida — mantida resposta')
          emit('reflection.critique_invalid', 'reflection', 'done')
        }
      } else {
        steps.push('regras detectaram problemas — revisão direta')
        emit('reflection.direct_revision', 'reflection', 'done')
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
        emit('reflection.revision', 'reflection', 'start')
        const revision = await this.router.completeChat(revisionMessages, tier, routerOpts)
        emit('reflection.revision', 'reflection', 'done')
        usages.push(revision.usage)
        provider = revision.provider
        model = revision.model
        reply = revision.text
        deterministic = validateAvaReplyDeterministic(reply, input.bundle.insights, trimmed, reflectionOpts)
      }
      emit('reflection.rules_check', 'reflection', 'done')
    }

    const reflection = combineReflectionOutcome(deterministic, critique, revised, attempts, steps)
    const mergedUsage = mergeTokenUsages(usages)

    const quota = await this.quota.recordUsage(input.scopeId, {
      accountId: input.accountId,
      feature: 'ava_chat',
      patientId: input.patientId,
      conversationId: input.conversationId,
      provider,
      model,
      tier,
      usage: mergedUsage,
      metadata: {
        healthThreadId: input.healthThreadId ?? null,
        conversationId: input.conversationId ?? null,
        reflection: {
          satisfactory: reflection.satisfactory,
          revised: reflection.revised,
          attempts: reflection.attempts,
          severity: reflection.severity,
          issueCount: reflection.issues.length,
        },
        llmCalls: usages.length,
      },
    }, input.quotaContext)

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
      activityTrace,
    }
  }
}
