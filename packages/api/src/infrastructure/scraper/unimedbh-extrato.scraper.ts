export interface UnimedBhUsageItem {
  patientName: string
  cardNumber: string
  procedureDate: string
  procedureDescription: string
  doctorName: string
  value: string
  invoiceNumber: string
  quantity: string
  /** consulta | exame | outro — derived from DescricaoAtendimento */
  kind: 'consulta' | 'exame' | 'outro'
  providerExternalId?: string
  procedureExternalId?: string
  chargedAmount?: number
  copartCompanyAmount?: number
  copartBaseAmount?: number
}

/** @deprecated Use UnimedBhSyncScraper — kept for type export compatibility */
export class UnimedBhExtratoScraper {
  async scrape(): Promise<never> {
    throw new Error('Use UnimedBhSyncScraper — standalone extrato scraper is deprecated')
  }
}
