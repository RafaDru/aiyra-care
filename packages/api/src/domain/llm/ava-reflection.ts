import type { FamilySupportInsight } from '../../domain/family-support/family-support.types.js'
import type { LlmMessage, LlmTokenUsage } from './llm.types.js'

export type AvaReflectionSeverity = 'ok' | 'minor' | 'critical'

export interface AvaCritiqueResult {
  satisfactory: boolean
  issues: string[]
  severity: AvaReflectionSeverity
}

export interface AvaReflectionOutcome {
  satisfactory: boolean
  issues: string[]
  severity: AvaReflectionSeverity
  revised: boolean
  attempts: number
  /** Passos visíveis na UI (sem chain-of-thought bruto) */
  steps: string[]
}

const DIAGNOSIS_PATTERNS: RegExp[] = [
  /é\s+(uma\s+|um\s+)?(pneumonia|asma|gripe|covid|diabetes|sinusite|bronquite|meningite|apendicite)/i,
  /(tem|têm)\s+(pneumonia|asma|gripe|covid|diabetes|sinusite|bronquite)/i,
  /diagnóstico\s+(é|de|provável)/i,
  /(certeza|certamente|sem dúvida)\s+(é|que é)/i,
  /(o quadro|isso|ele está)\s+é\s+(uma\s+|um\s+)?\w+/i,
  /confirmad[oa]\s+(como|de)/i,
]

const PRESCRIPTION_PATTERNS: RegExp[] = [
  /\b(tome|administre|aplique|use) \d+/i,
  /\b\d+\s*mg\b.*(tome|administre|de \d)/i,
  /\baumente a dose\b/i,
  /\bdiminua a dose\b/i,
]

const EMERGENCY_USER_KEYWORDS = /\b(samu|192|193|emergência|urgência|risco de vida|desmaio|convulsão|não respira)\b/i

export function isAvaReflectionEnabled(): boolean {
  const v = process.env.AVA_REFLECTION_ENABLED?.trim().toLowerCase()
  if (v === '0' || v === 'false' || v === 'no') return false
  return true
}

export function avaReflectionMaxRevisions(): number {
  const n = Number(process.env.AVA_REFLECTION_MAX_REVISIONS ?? 1)
  return Number.isFinite(n) ? Math.max(0, Math.min(2, Math.floor(n))) : 1
}

/** Pula 2ª chamada LLM de crítica quando regras determinísticas passaram (latência + tokens). */
export function shouldSkipLlmCritique(
  deterministic: { issues: string[]; severity: AvaReflectionSeverity },
  reply: string,
  userMessage: string,
): boolean {
  const force = process.env.AVA_ALWAYS_CRITIQUE?.trim() === '1'
  if (force) return false
  const skipWhenOk = process.env.AVA_SKIP_CRITIQUE_WHEN_OK?.trim() !== '0'
  if (!skipWhenOk) return false
  if (deterministic.severity !== 'ok' || deterministic.issues.length > 0) return false
  if (EMERGENCY_USER_KEYWORDS.test(userMessage)) return false
  const longReplyChars = Number(process.env.AVA_CRITIQUE_MIN_REPLY_CHARS ?? 2800)
  if (reply.length >= longReplyChars) return false
  return true
}

function clipContext(text: string, max = 2800): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}… [contexto truncado para crítica]`
}

export function estimateAvaTurnTokenReserve(baseReserve: number): number {
  if (!isAvaReflectionEnabled()) return baseReserve
  const multiplier = Number(process.env.AVA_REFLECTION_RESERVE_MULTIPLIER ?? 2.5)
  const m = Number.isFinite(multiplier) && multiplier > 1 ? multiplier : 2.5
  return Math.ceil(baseReserve * m)
}

export function mergeTokenUsages(usages: LlmTokenUsage[]): LlmTokenUsage {
  if (!usages.length) {
    return { tokensIn: 0, tokensOut: 0, tokensTotal: 0, usageSource: 'estimated' }
  }
  const tokensIn = usages.reduce((s, u) => s + u.tokensIn, 0)
  const tokensOut = usages.reduce((s, u) => s + u.tokensOut, 0)
  const usageSource = usages.every((u) => u.usageSource === 'api') ? 'api' : 'estimated'
  return {
    tokensIn,
    tokensOut,
    tokensTotal: tokensIn + tokensOut,
    usageSource,
  }
}

export function validateAvaReplyDeterministic(
  reply: string,
  insights: FamilySupportInsight[],
  userMessage: string,
  opts?: { clinicianLabel?: string; ageCategory?: string },
): { issues: string[]; severity: AvaReflectionSeverity } {
  const issues: string[] = []
  const text = reply.trim()
  if (!text) {
    return { issues: ['Resposta vazia'], severity: 'critical' }
  }
  if (text.length > 3500) {
    issues.push('Resposta excessivamente longa')
  }

  for (const pattern of DIAGNOSIS_PATTERNS) {
    if (pattern.test(text)) {
      issues.push('Linguagem de diagnóstico afirmativo')
      break
    }
  }

  for (const pattern of PRESCRIPTION_PATTERNS) {
    if (pattern.test(text)) {
      issues.push('Instrução de dose ou prescrição')
      break
    }
  }

  const criticalBlocks = insights.filter(
    (i) => i.action === 'do_not_apply' || (i.priority === 'critical' && i.kind === 'medication_safety'),
  )
  for (const block of criticalBlocks) {
    const encouragesUse = /\b(aplicar|administre|tomar|use o|pode dar|pode tomar)\b/i.test(text)
    const discourages = /\b(não (aplic|administre|use|tom)|não dê|evite)\b/i.test(text)
    if (encouragesUse && !discourages) {
      issues.push(`Possível contradição com alerta: ${block.title}`)
    }
  }

  if (EMERGENCY_USER_KEYWORDS.test(userMessage) && !/\b(192|193|samu|emergência|pronto.?socorro|atendimento)\b/i.test(text)) {
    issues.push('Contexto de urgência sem orientação de canal de emergência')
  }

  if (
    opts?.ageCategory === 'adults'
    && /\bpediatra\b/i.test(text)
    && !/\b(pediatra\s+da\s+infância|filho|filha|menor)\b/i.test(text)
  ) {
    issues.push('Menciona pediatra para paciente adulto')
  }

  if (
    /\b(não tenho acesso|não tenho informações|não posso acessar)\b/i.test(text)
    && /\b(hemograma|exame|resultado|laboratório)\b/i.test(userMessage)
  ) {
    issues.push('Resposta genérica de “sem acesso” sem usar o prontuário fornecido')
  }

  const severity: AvaReflectionSeverity = issues.some((i) =>
    i.includes('diagnóstico') || i.includes('contradição') || i.includes('prescrição') || i === 'Resposta vazia',
  ) ? 'critical' : issues.length ? 'minor' : 'ok'

  return { issues, severity }
}

export function parseAvaCritiqueJson(raw: string): AvaCritiqueResult | null {
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  try {
    const parsed = JSON.parse(cleaned) as Partial<AvaCritiqueResult>
    if (typeof parsed.satisfactory !== 'boolean') return null
    const issues = Array.isArray(parsed.issues)
      ? parsed.issues.filter((x): x is string => typeof x === 'string').slice(0, 8)
      : []
    const severity = parsed.severity === 'critical' || parsed.severity === 'minor' || parsed.severity === 'ok'
      ? parsed.severity
      : parsed.satisfactory ? 'ok' : 'minor'
    return { satisfactory: parsed.satisfactory, issues, severity }
  } catch {
    return null
  }
}

export const AVA_CRITIQUE_SYSTEM = `Você é o verificador de qualidade da Ava (apoio familiar pediátrico).
NÃO converse com o responsável — apenas avalie a RESPOSTA PROPOSTA.
Regras que a resposta DEVE cumprir:
- Sem diagnóstico afirmativo ("é pneumonia", "tem diabetes").
- Sem prescrever dose ou instruir medicamento sem confirmação médica.
- Sem inventar dados que não estão no contexto.
- Em urgência, mencionar SAMU 192 ou buscar atendimento quando apropriado.
- Respeitar alertas críticos do contexto (alergia, não aplicar medicação).

Responda APENAS JSON válido:
{"satisfactory":boolean,"issues":["..."],"severity":"ok"|"minor"|"critical"}`

export function buildCritiqueUserPrompt(
  userMessage: string,
  contextBlock: string,
  proposedReply: string,
  deterministicIssues: string[],
): string {
  return `Mensagem do responsável:
${userMessage}

Contexto determinístico do prontuário:
${clipContext(contextBlock)}

Resposta proposta da Ava:
${proposedReply}

Problemas já detectados por regras (${deterministicIssues.length}):
${deterministicIssues.length ? deterministicIssues.join('; ') : 'nenhum'}

Avalie se a resposta é satisfatória para enviar à família.`
}

export function buildRevisionMessages(
  baseMessages: LlmMessage[],
  issues: string[],
): LlmMessage[] {
  const fixList = issues.slice(0, 6).join('\n- ')
  return [
    ...baseMessages,
    {
      role: 'assistant',
      content: '[resposta anterior omitida — reescreva]',
    },
    {
      role: 'user',
      content: `Verificação interna: a resposta anterior não passou na validação.
Problemas:
- ${fixList}

Reescreva UMA resposta final para o responsável, corrigindo os problemas.
Mantenha empatia, brevidade, sem diagnóstico afirmativo.`,
    },
  ]
}

export function combineReflectionOutcome(
  deterministic: { issues: string[]; severity: AvaReflectionSeverity },
  critique: AvaCritiqueResult | null,
  revised: boolean,
  attempts: number,
  steps: string[],
): AvaReflectionOutcome {
  const issues = [...new Set([...deterministic.issues, ...(critique?.issues ?? [])])]
  let severity = deterministic.severity
  if (critique?.severity === 'critical' || deterministic.severity === 'critical') severity = 'critical'
  else if (critique?.severity === 'minor' || deterministic.severity === 'minor') severity = 'minor'

  const satisfactory = severity === 'ok'
    && (critique?.satisfactory ?? true)
    && deterministic.issues.length === 0

  return {
    satisfactory,
    issues,
    severity,
    revised,
    attempts,
    steps,
  }
}
