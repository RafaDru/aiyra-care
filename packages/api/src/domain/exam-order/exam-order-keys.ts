/** Chave estável de pedido no AiyraCare (dedup por paciente + portal). */
export function buildExamOrderExternalKey(source: string, portalOrderId: string): string {
  const src = source.trim().toLowerCase()
  const id = portalOrderId.trim()
  return `${src}:pedido:${id}`
}
