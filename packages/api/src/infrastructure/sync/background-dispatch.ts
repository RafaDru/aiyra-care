/**
 * Despacho de sync em background no processo da API.
 *
 * Hoje: fire-and-forget via setImmediate no mesmo Node (não é worker separado).
 * Futuro: enfileirar jobId + integrationLinkId em fila (BullMQ, etc.) e consumir
 * em processo dedicado com Playwright.
 */
export function dispatchBackgroundTask(task: () => Promise<void>): void {
  setImmediate(() => {
    task().catch((err) => {
      console.error('[background-task]', err)
    })
  })
}
