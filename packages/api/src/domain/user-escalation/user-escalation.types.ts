export interface AccountNotificationPreferences {
  accountId: string
  syncEscalationEmail: boolean
  syncEscalationOptedInAt: Date | null
  updatedAt: Date
}

export type SyncEscalationIncidentStatus = 'open' | 'resolved'

export interface SyncEscalationIncident {
  id: string
  accountId: string
  integrationLinkId: string
  portalType: string
  status: SyncEscalationIncidentStatus
  failureCount: number
  lastNotifiedAt: Date | null
  openedAt: Date
  resolvedAt: Date | null
  updatedAt: Date
}

export interface UserEscalationDispatchPayload {
  type: 'user_sync_escalation'
  status: 'open' | 'resolved'
  message: string
  appUrl?: string
  checkedAt: string
}
