export interface PortalCredentials {
  cpf: string
  email?: string
  password: string
  birthDate?: string
  susCardNumber?: string
  insuranceMembershipNumber?: string
}

export type PortalType = 'conectesus' | 'unimed' | 'amil' | 'bradesco_saude' | 'sulamerica' | 'other'

export interface PortalSession {
  portalType: PortalType
  label: string
  baseUrl: string
  credentials: PortalCredentials
}
