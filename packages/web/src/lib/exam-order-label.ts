import type { ExamOrder } from './api.types.js'

/** `34||2026||1244885` → `1244885-34` (padrão Hermes Pardini). */
export function formatHermesPardiniCompoundPortalOrderId(portalOrderId: string): string {
  const parts = portalOrderId.split('||')
  if (parts.length === 3 && parts.every((p) => /^\d+$/.test(p))) {
    return `${parts[2]}-${parts[0]}`
  }
  return portalOrderId
}

export function parseExamOrderLabelFromNotes(notes: string | null | undefined): string | null {
  if (!notes?.trim()) return null
  try {
    const parsed = JSON.parse(notes) as { portalOrderLabel?: string }
    if (typeof parsed.portalOrderLabel === 'string' && parsed.portalOrderLabel.trim()) {
      return parsed.portalOrderLabel.trim()
    }
  } catch {
    // not JSON
  }
  return null
}

/** Label amigável do pedido para exibição na UI. */
export function examOrderDisplayLabel(order: ExamOrder): string {
  const fromNotes = parseExamOrderLabelFromNotes(order.notes)
  if (fromNotes) return fromNotes
  if (order.portalOrderId) {
    if (order.source === 'hermes_pardini') {
      return formatHermesPardiniCompoundPortalOrderId(order.portalOrderId)
    }
    return order.portalOrderId
  }
  return order.id.slice(0, 8)
}
