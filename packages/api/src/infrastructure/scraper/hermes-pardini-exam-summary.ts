function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function pickString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

function formatHistorico(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (!Array.isArray(value)) return null
  const parts = value
    .map((row) => {
      const r = asRecord(row)
      const date = pickString(r.data ?? r.dataResultado ?? r.dataExame)
      const result = pickString(r.resultado ?? r.valor ?? r.value ?? r.result)
      if (date && result) return `${date}: ${result}`
      return result ?? date
    })
    .filter(Boolean)
  return parts.length ? parts.join('; ') : null
}

/** Monta resumo textual do exame a partir dos campos do BFF Hermes Pardini. */
export function extractHermesPardiniExamSummary(
  exam: Record<string, unknown>,
  pedido?: Record<string, unknown>,
): string | null {
  const parts: string[] = []

  const directFields = [
    'resultado',
    'resultadoFormatado',
    'valor',
    'valorReferencia',
    'interpretacao',
    'observacao',
    'comentario',
    'descricaoResultado',
    'resultadoAnterior',
  ]
  for (const key of directFields) {
    const v = pickString(exam[key])
    if (v) parts.push(`${key}: ${v}`)
  }

  const historico = formatHistorico(exam.historico ?? exam.historicoResultado ?? exam.resultadosAnteriores)
  if (historico) parts.push(`histórico: ${historico}`)

  if (pedido) {
    const pedidoObs = pickString(pedido.observacao ?? pedido.comentario)
    if (pedidoObs) parts.push(`pedido: ${pedidoObs}`)
  }

  if (!parts.length) return null
  return parts.join(' | ')
}
