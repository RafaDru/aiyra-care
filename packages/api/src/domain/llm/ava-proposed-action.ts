export type AvaProposedActionType =
  | 'integration_sync'
  | 'clinical_export'
  | 'hygiene_merge'
  | 'hygiene_dismiss'

export interface AvaProposedAction {
  id: string
  type: AvaProposedActionType
  label: string
  description?: string
  payload: Record<string, unknown>
}

export interface AvaActionExecuteInput {
  type: AvaProposedActionType
  payload: Record<string, unknown>
}
