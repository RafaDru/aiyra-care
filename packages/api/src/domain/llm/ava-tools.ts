import type { AvaEntityPin } from '../../application/llm/ava-entity-context.service.js'
import type { FamilySupportBundle } from '../family-support/family-support.types.js'
import type { AvaActivityEmitter, AvaActivityEvent } from './ava-activity.js'
import { emitAvaActivity } from './ava-activity.js'

export interface AvaToolContext {
  patientId: string
  healthThreadId?: string
  message: string
  entityPin?: AvaEntityPin
}

export interface AvaToolGatherResult {
  bundle: FamilySupportBundle
  patientContextBlock: string
  clinicianLabel: string
  ageCategory: string
  entityPinBlock?: string
  operationalBlock?: string
}

export interface AvaToolDefinition {
  id: string
  kind: 'context' | 'tool'
  activityCode: import('./ava-activity.js').AvaActivityCode
  /** Heurística opcional — se false, ferramenta não roda neste turno. */
  shouldRun?: (ctx: AvaToolContext) => boolean
}

/** Catálogo read-only G2/G4 — cada item corresponde a um bloco do prompt. */
export const AVA_READ_TOOLS: AvaToolDefinition[] = [
  {
    id: 'load_patient_record',
    kind: 'context',
    activityCode: 'context.patient_record',
  },
  {
    id: 'load_family_alerts',
    kind: 'context',
    activityCode: 'context.family_alerts',
  },
  {
    id: 'load_operational',
    kind: 'context',
    activityCode: 'context.operational',
    shouldRun: (ctx) =>
      /\b(sync|sincron|integra|portal|unimed|amil|mater|hermes|naveg|aba|carteira|convênio)\b/i.test(ctx.message),
  },
  {
    id: 'load_entity_pin',
    kind: 'context',
    activityCode: 'context.entity_pin',
    shouldRun: (ctx) => Boolean(ctx.entityPin),
  },
]

export interface AvaToolRunnerDeps {
  loadPatientContext: (patientId: string) => Promise<{
    block: string
    clinicianLabel: string
    ageCategory: string
  }>
  loadFamilyInsights: (patientId: string, healthThreadId?: string) => Promise<FamilySupportBundle>
  loadOperationalBlock: (patientId: string) => Promise<string>
  loadEntityPinBlock: (patientId: string, pin: AvaEntityPin) => Promise<string>
}

/** Executa ferramentas de contexto e emite status para a UI. */
export async function runAvaContextTools(
  deps: AvaToolRunnerDeps,
  ctx: AvaToolContext,
  emitter?: AvaActivityEmitter,
): Promise<{ result: AvaToolGatherResult; trace: AvaActivityEvent[] }> {
  const trace: AvaActivityEvent[] = []
  const push = (ev: AvaActivityEvent) => trace.push(ev)

  const wrap = async (
    code: import('./ava-activity.js').AvaActivityCode,
    kind: 'context' | 'tool',
    run: () => Promise<void>,
  ) => {
    push(emitAvaActivity(emitter, code, kind, 'start'))
    await run()
    push(emitAvaActivity(emitter, code, kind, 'done'))
  }

  let patientContextBlock = ''
  let clinicianLabel = 'pediatra'
  let ageCategory = 'child'
  let bundle: FamilySupportBundle = {
    insights: [],
    disclaimer: '',
    patientId: ctx.patientId,
    generatedAt: new Date().toISOString(),
  }
  let operationalBlock: string | undefined
  let entityPinBlock: string | undefined

  for (const tool of AVA_READ_TOOLS) {
    if (tool.shouldRun && !tool.shouldRun(ctx)) {
      push(emitAvaActivity(emitter, tool.activityCode, tool.kind, 'skip'))
      continue
    }

    if (tool.id === 'load_patient_record') {
      await wrap(tool.activityCode, tool.kind, async () => {
        const row = await deps.loadPatientContext(ctx.patientId)
        patientContextBlock = row.block
        clinicianLabel = row.clinicianLabel
        ageCategory = row.ageCategory
      })
      continue
    }

    if (tool.id === 'load_family_alerts') {
      await wrap(tool.activityCode, tool.kind, async () => {
        bundle = await deps.loadFamilyInsights(ctx.patientId, ctx.healthThreadId)
      })
      continue
    }

    if (tool.id === 'load_operational') {
      await wrap(tool.activityCode, tool.kind, async () => {
        operationalBlock = await deps.loadOperationalBlock(ctx.patientId)
      })
      continue
    }

    if (tool.id === 'load_entity_pin' && ctx.entityPin) {
      await wrap(tool.activityCode, tool.kind, async () => {
        entityPinBlock = await deps.loadEntityPinBlock(ctx.patientId, ctx.entityPin!)
      })
    }
  }

  return {
    result: {
      bundle,
      patientContextBlock,
      clinicianLabel,
      ageCategory,
      entityPinBlock,
      operationalBlock,
    },
    trace,
  }
}
