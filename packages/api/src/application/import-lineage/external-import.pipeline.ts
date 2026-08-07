import type { ExternalDataAdapter, AdapterContext } from '../../domain/import-lineage/external-data-adapter.js'
import { toInboundRecord } from '../../domain/import-lineage/external-data-adapter.js'
import type { ProcessedLink } from '../../domain/import-lineage/external-record.js'
import type { ImportLineageService } from './import-lineage.service.js'

export interface IngestExternalOptions<TInternal> {
  persist: (internal: TInternal) => Promise<ProcessedLink>
}

/**
 * Pipeline padrão: raw → normalização → modelo interno → link de linhagem.
 */
export async function ingestExternalRecord<TExternal, TInternal>(
  lineage: ImportLineageService,
  adapter: ExternalDataAdapter<TExternal, TInternal>,
  external: TExternal,
  ctx: AdapterContext,
  options: IngestExternalOptions<TInternal>,
): Promise<{ rawId: string; internal: TInternal }> {
  const inbound = toInboundRecord(adapter, external, ctx)
  const normalization = inbound.normalization
  const internal = adapter.toInternal(external, ctx, normalization)
  const processed = await options.persist(internal)
  const rawId = await lineage.recordInbound(ctx.batchId, ctx.patientId, inbound, processed)
  return { rawId, internal }
}
