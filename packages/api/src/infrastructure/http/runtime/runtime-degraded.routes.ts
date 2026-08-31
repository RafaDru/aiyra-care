import { pgPool } from '../../../db/postgres.js'
import { RuntimeDegradedService } from '../../../application/ops/runtime-degraded.service.js'
import { RuntimeDegradedPgRepository } from '../../persistence/runtime-degraded.pg.repository.js'

let instance: RuntimeDegradedService | null = null

export function getRuntimeDegradedService(): RuntimeDegradedService {
  if (!instance) {
    instance = new RuntimeDegradedService(new RuntimeDegradedPgRepository(pgPool))
  }
  return instance
}
