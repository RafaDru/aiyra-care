/** Fonte lógica do dado (quem produziu o payload). */
export type ImportSource =
  | 'caderneta'
  | 'conectesus'
  | 'unimed'
  | 'amil'
  | 'bradesco'
  | 'manual_upload'
  | 'ocr'
  | 'api'

/** Portal ou canal de coleta (como o dado foi obtido). */
export type ImportPortal =
  | 'caderneta'
  | 'conectesus'
  | 'unimed_bh'
  | 'amil'
  | 'bradesco'
  | 'document_scan'
  | 'rest_api'

/** Tipo do registro bruto dentro do lote. */
export type ImportRecordType =
  | 'vaccine_schedule'
  | 'vaccine_applied'
  | 'development_milestone'
  | 'clinical_record'
  | 'exam'
  | 'prescription'
  | 'medication'
  | 'authorization'
  | 'insurance_plan'
  | 'growth_record'
  | 'document'
  | 'patient_identity'
  | 'unknown'

export interface ImportBatchProps {
  patientId: string
  source: ImportSource
  portal?: ImportPortal | null
  status?: 'running' | 'completed' | 'failed'
  stats?: Record<string, unknown> | null
}

export interface ImportBatchData {
  id: string
  patientId: string
  source: ImportSource
  portal: ImportPortal | null
  status: 'running' | 'completed' | 'failed'
  stats: Record<string, unknown> | null
  createdAt: Date
}
