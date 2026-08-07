/** Resultado estruturado da interpretação de receita / pedido manuscrito. */
export interface PrescriptionItemUnderstanding {
  medication: string
  dose?: string | null
  route?: string | null
  frequency?: string | null
  duration?: string | null
  instructions?: string | null
  confidence?: number | null
}

export type InterpretationTier = 'free' | 'premium'

export interface PrescriptionUnderstanding {
  patientName?: string | null
  doctorName?: string | null
  doctorCrm?: string | null
  issueDate?: string | null
  clinicName?: string | null
  items: PrescriptionItemUnderstanding[]
  rawTranscription: string
  warnings: string[]
  provider: string
  tier?: InterpretationTier
}

export interface HandwritingQuota {
  scopeId: string
  monthlyFreeAllowance: number
  monthlyFreeRemaining: number
  packageCredits: number
  totalAvailable: number
  monthlyPeriod: string
  interpretationEnabled: boolean
  pricing?: HandwritingPricingInfo
}

/** Metadados para UI / futura assinatura. */
export interface HandwritingPricingInfo {
  freeTierLabel: string
  freeTierProviders: string[]
  premiumTierLabel: string
  premiumTierProviders: string[]
  monthlyFreeUsesFreeTierOnly: boolean
  packageUsesPremiumFallback: boolean
}

export type HandwritingCreditEventType =
  | 'interpret'
  | 'grant_package'
  | 'monthly_reset'
  | 'admin_adjust'

export interface HandwritingCreditAccount {
  scopeId: string
  packageCredits: number
  monthlyFreeAllowance: number
  monthlyFreeUsed: number
  monthlyPeriod: string
}

export interface HandwritingCreditsRepository {
  getOrCreateAccount(scopeId: string, defaultMonthlyFree: number): Promise<HandwritingCreditAccount>
  saveAccount(account: HandwritingCreditAccount): Promise<void>
  appendEvent(input: {
    scopeId: string
    documentId?: string
    eventType: HandwritingCreditEventType
    creditsDelta: number
    metadata?: Record<string, unknown>
  }): Promise<void>
}

export interface PrescriptionUnderstandingPort {
  interpretHandwriting(
    buffer: Buffer,
    mimeType: string,
    opts?: { tier: InterpretationTier; ocrText?: string | null },
  ): Promise<PrescriptionUnderstanding>
}
