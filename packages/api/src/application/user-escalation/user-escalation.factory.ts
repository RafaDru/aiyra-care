import type { Pool } from 'pg'
import { UserEscalationService } from '../../application/user-escalation/user-escalation.service.js'
import { UserEscalationPgRepository } from '../persistence/user-escalation.pg.repository.js'
import { ProductEventService } from '../../application/telemetry/product-event.service.js'
import { ProductEventPgRepository } from '../persistence/product-event.pg.repository.js'

let service: UserEscalationService | null = null

export function getUserEscalationService(pool: Pool): UserEscalationService {
  if (!service) {
    service = new UserEscalationService(
      new UserEscalationPgRepository(pool),
      new ProductEventService(new ProductEventPgRepository(pool)),
    )
  }
  return service
}
