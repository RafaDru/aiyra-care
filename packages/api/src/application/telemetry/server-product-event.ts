import type { ProductEventService } from './product-event.service.js'
import type { ProductEventInput } from '../../domain/telemetry/product-event.js'

/** Telemetria server-side (sem session web). Falhas silenciosas — não bloqueia fluxo. */
export async function trackServerProductEvent(
  service: ProductEventService | undefined,
  accountId: string | null,
  event: ProductEventInput,
): Promise<void> {
  if (!service) return
  try {
    await service.ingest(accountId, [event])
  } catch {
    // observabilidade não deve quebrar fluxo principal
  }
}

/** Telemetria ops interna (account_id null) — worker, webhook billing, etc. */
export async function trackOpsProductEvent(
  service: ProductEventService | undefined,
  event: ProductEventInput,
): Promise<void> {
  await trackServerProductEvent(service, null, event)
}
