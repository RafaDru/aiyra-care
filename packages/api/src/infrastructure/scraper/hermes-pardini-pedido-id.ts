interface HermesPardiniPedidoLike {
  idPedido?: number | string
  numeroPedido?: string | number
}

/**
 * ID usado nas rotas da API (`GET /pedidos/{id}/exames`, `POST /download`).
 * Hermes expõe `idPedido` composto (ex. `34||2026||1244885`) e `numeroPedido` legível (ex. `1244885-34`).
 */
export function hermesPardiniPedidoApiId(pedido: HermesPardiniPedidoLike): string {
  const id = pedido.idPedido ?? pedido.numeroPedido ?? 'unknown'
  return String(id)
}

/**
 * Label exibida ao usuário — prioriza `numeroPedido` do portal; fallback formata o composto da API.
 */
export function formatHermesPardiniPedidoDisplayId(
  portalOrderId: string | null | undefined,
  numeroPedido?: string | number | null,
): string | null {
  if (numeroPedido != null && String(numeroPedido).trim()) {
    return String(numeroPedido).trim()
  }
  if (!portalOrderId) return null
  return formatHermesPardiniCompoundPortalOrderId(portalOrderId)
}

/** `34||2026||1244885` → `1244885-34` (padrão observado no painel Hermes Pardini). */
export function formatHermesPardiniCompoundPortalOrderId(portalOrderId: string): string {
  const parts = portalOrderId.split('||')
  if (parts.length === 3 && parts.every((p) => /^\d+$/.test(p))) {
    return `${parts[2]}-${parts[0]}`
  }
  return portalOrderId
}

export function hermesPardiniPedidoDisplayFromPedido(pedido: HermesPardiniPedidoLike): string {
  const apiId = hermesPardiniPedidoApiId(pedido)
  return formatHermesPardiniPedidoDisplayId(apiId, pedido.numeroPedido) ?? apiId
}
