import { pgPool } from '../../db/postgres.js'
import { RuntimeDegradedService } from './runtime-degraded.service.js'
import { RuntimeDegradedPgRepository } from '../../infrastructure/persistence/runtime-degraded.pg.repository.js'

let instance: RuntimeDegradedService | null = null

/** Singleton for runtime degraded state — keep out of HTTP route modules to avoid import cycles at startup. */
export function getRuntimeDegradedService(): RuntimeDegradedService {
  if (!instance) {
    instance = new RuntimeDegradedService(new RuntimeDegradedPgRepository(pgPool))
  }
  return instance
}
