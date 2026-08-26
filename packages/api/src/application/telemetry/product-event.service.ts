import {
  PRODUCT_EVENT_NAME_SET,
  sanitizeProductEventProperties,
  type ProductEventInput,
  type ProductEventName,
} from '../../domain/telemetry/product-event.js'
import type { ProductEventRepository } from '../../domain/telemetry/product-event.repository.js'

const MAX_BATCH = 25

export class ProductEventService {
  constructor(private readonly repo: ProductEventRepository) {}

  async ingest(
    accountId: string | null,
    events: ProductEventInput[],
  ): Promise<{ accepted: number; rejected: number }> {
    if (!events.length) return { accepted: 0, rejected: 0 }

    const sanitized: ProductEventInput[] = []
    let rejected = 0

    for (const event of events.slice(0, MAX_BATCH)) {
      if (!PRODUCT_EVENT_NAME_SET.has(event.eventName)) {
        rejected++
        continue
      }
      sanitized.push({
        eventName: event.eventName as ProductEventName,
        sessionId: event.sessionId?.slice(0, 64),
        route: event.route?.slice(0, 128),
        patientId: event.patientId,
        properties: sanitizeProductEventProperties(event.properties),
      })
    }

    if (!sanitized.length) return { accepted: 0, rejected }

    await this.repo.insertMany(accountId, sanitized)
    return { accepted: sanitized.length, rejected }
  }
}
