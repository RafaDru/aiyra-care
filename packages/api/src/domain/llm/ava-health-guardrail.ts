export type AvaTopicClassification = 'health' | 'off_topic'

const OFF_TOPIC_PATTERNS: RegExp[] = [
  /\b(javascript|typescript|python|java|c\+\+|react|node\.?js|sql\s+query|git\s+commit|docker|kubernetes)\b/i,
  /\b(escreva\s+(um\s+)?c[oó]digo|programa(r)?\s+em|debugar|compilar|api\s+rest)\b/i,
  /\b(cursor\s+ide|vscode|copilot|automa[cç][aã]o\s+na\s+plataforma)\b/i,
  /\b(bitcoin|criptomoeda|investir\s+em\s+a[cç][oõ]es|day\s*trade)\b/i,
  /\b(receita\s+de\s+bolo|futebol|novela|pol[ií]tica\s+partid[aá]ria)\b/i,
]

const HEALTH_HINT_PATTERNS: RegExp[] = [
  /\b(sa[uú]de|m[eé]dic|consulta|exame|vacina|rem[eé]dio|medicamento|sintoma|febre|dor|alergia|pediatr)/i,
  /\b(conv[eê]nio|autoriza[cç][aã]o|hemograma|glicemia|press[aã]o|hospital|pronto\s*socorro)\b/i,
  /\b(filho|filha|beb[eê]|crian[cç]a|gesta[cç][aã]o|amamenta[cç][aã]o|cuidador)\b/i,
]

export const AVA_OFF_TOPIC_REPLY_PT =
  'Sou a Ava, sua companheira de cuidado de saúde na família. Posso ajudar com exames, vacinas, medicamentos, consultas e organização do cuidado — não consigo ajudar com programação, finanças ou outros assuntos fora desse contexto. Como posso apoiar o cuidado de saúde hoje?'

export function classifyAvaUserMessage(message: string): AvaTopicClassification {
  const text = message.trim()
  if (text.length < 3) return 'health'

  const hasHealthHint = HEALTH_HINT_PATTERNS.some((re) => re.test(text))
  if (hasHealthHint) return 'health'

  const offTopic = OFF_TOPIC_PATTERNS.some((re) => re.test(text))
  return offTopic ? 'off_topic' : 'health'
}

export function isAvaHealthGuardrailEnabled(): boolean {
  const raw = process.env.AVA_HEALTH_GUARDRAIL?.trim().toLowerCase()
  if (raw === '0' || raw === 'false' || raw === 'off') return false
  return true
}
