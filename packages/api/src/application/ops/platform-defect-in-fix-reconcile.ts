import type { PlatformDefectRecord } from '../../domain/ops/platform-defect.types.js'
import type { PlatformDefectPgRepository } from '../../infrastructure/persistence/platform-defect.pg.repository.js'
import { PlatformDefectService } from './platform-defect.service.js'

/** `in_fix` só é válido após webhook defect_fix aceito (`last_fix_dispatch_sent_at`). */
export function defectInFixWithoutDispatch(defect: PlatformDefectRecord): boolean {
  return defect.status === 'in_fix' && defect.lastFixDispatchSentAt == null
}

export async function reconcileUntruthfulDefectInFix(
  service: PlatformDefectService,
  defect: PlatformDefectRecord,
): Promise<PlatformDefectRecord> {
  if (!defectInFixWithoutDispatch(defect)) return defect
  return service.revertStaleInFix(defect.id)
}

export async function reconcileUntruthfulDefectsInList(
  service: PlatformDefectService,
  items: PlatformDefectRecord[],
): Promise<PlatformDefectRecord[]> {
  const out: PlatformDefectRecord[] = []
  for (const item of items) {
    out.push(await reconcileUntruthfulDefectInFix(service, item))
  }
  return out
}

export async function reconcileDefectByIdIfNeeded(
  service: PlatformDefectService,
  repo: PlatformDefectPgRepository,
  id: string,
): Promise<PlatformDefectRecord | null> {
  const defect = await repo.findById(id)
  if (!defect) return null
  return reconcileUntruthfulDefectInFix(service, defect)
}
