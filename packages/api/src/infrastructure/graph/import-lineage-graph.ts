import { neo4jDriver } from '../../db/neo4j.js'
import { pgPool } from '../../db/postgres.js'
import { ImportLineageGraphProjector, type ProcessedRecordProjectionInput } from './import-lineage-graph.projector.js'

export const importLineageGraphProjector = new ImportLineageGraphProjector(neo4jDriver, pgPool)

export function scheduleImportLineageProjection(input: ProcessedRecordProjectionInput): void {
  importLineageGraphProjector.scheduleProcessedRecord(input)
}
