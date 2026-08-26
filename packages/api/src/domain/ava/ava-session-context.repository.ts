export type AvaSessionPinEntityType = 'exam' | 'exam_order' | 'exam_result_item' | 'exam_marker'
export type AvaSessionPinSource = 'user' | 'accelerator' | 'auto' | 'inferred'

export interface AvaSessionPinRow {
  id: string
  conversationId: string
  entityType: AvaSessionPinEntityType
  entityId: string
  patientId: string
  label: string | null
  source: AvaSessionPinSource
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AvaSessionContextRepository {
  listActive(conversationId: string): Promise<AvaSessionPinRow[]>
  upsertPin(input: {
    conversationId: string
    entityType: AvaSessionPinEntityType
    entityId: string
    patientId: string
    label?: string | null
    source: AvaSessionPinSource
  }): Promise<AvaSessionPinRow>
  deactivatePin(conversationId: string, entityType: AvaSessionPinEntityType, entityId: string): Promise<void>
  deactivateAll(conversationId: string): Promise<void>
}
