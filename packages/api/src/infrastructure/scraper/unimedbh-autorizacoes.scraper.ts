export interface UnimedBhAuthorizationItem {
  patientName: string
  procedureCode: string
  procedureDescription: string
  doctorName: string
  doctorCouncil: string
  clinicName: string
  authorizationDate: string
  validityDate: string
  status: string
  guideNumber: string
  quantity: string
  solicitationNumber?: string
  guidePassword?: string
  specialty?: string
  solicitationUrl?: string
  solicId?: string
  solicIdEncrypted?: string
  authorizationType?: string
  classification?: string
  providerExternalId?: string
  localAddress?: string
  localPhone?: string
  locations?: Array<{
    formattedAddress?: string
    phone?: string
    city?: string
    state?: string
    latitude?: string
    longitude?: string
  }>
  history?: Array<{
    code?: string
    description?: string
    occurredAt?: string
    auditorName?: string
  }>
  items?: Array<{
    procedureCode?: string
    procedureDescription: string
    quantityRequested?: number
    quantityAuthorized?: number
    status?: string
    externalProcedureId?: string
  }>
}

export class UnimedBhAutorizacoesScraper {
  async scrape() {
    throw new Error('Use UnimedBhSyncScraper — standalone list scraper is deprecated')
  }
}
