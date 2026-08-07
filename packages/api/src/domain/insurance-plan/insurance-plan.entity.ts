export type InsuranceOperator = 'unimed' | 'amil' | 'bradesco_saude' | 'sus' | 'other'

export interface PlanAddOn {
  code?: string
  description: string
  includedAt?: string
}

export interface PlanWaitingPeriod {
  description: string
  endsAt?: string
  group?: string
}

export interface InsurancePlanProps {
  operator: string
  operatorName?: string
  planName: string
  productCode?: string
  networkName?: string
  networkCode?: string
  segmentation?: string
  accommodation?: string
  geographicCoverage?: string
  regulationType?: string
  contractType?: string
  contractorName?: string
  addOns?: PlanAddOn[]
  waitingPeriods?: PlanWaitingPeriod[]
  externalKey: string
  source?: string
  raw?: Record<string, unknown> | null
}

export interface InsurancePlanData {
  id: string
  operator: string
  operatorName: string | null
  planName: string
  productCode: string | null
  networkName: string | null
  networkCode: string | null
  segmentation: string | null
  accommodation: string | null
  geographicCoverage: string | null
  regulationType: string | null
  contractType: string | null
  contractorName: string | null
  addOns: PlanAddOn[]
  waitingPeriods: PlanWaitingPeriod[]
  externalKey: string
  source: string
  raw: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

export class InsurancePlan {
  private constructor(private readonly data: InsurancePlanData) {}

  static create(props: InsurancePlanProps, id?: string): InsurancePlan {
    const now = new Date()
    return new InsurancePlan({
      id: id ?? crypto.randomUUID(),
      operator: props.operator,
      operatorName: props.operatorName ?? null,
      planName: props.planName,
      productCode: props.productCode ?? null,
      networkName: props.networkName ?? null,
      networkCode: props.networkCode ?? null,
      segmentation: props.segmentation ?? null,
      accommodation: props.accommodation ?? null,
      geographicCoverage: props.geographicCoverage ?? null,
      regulationType: props.regulationType ?? null,
      contractType: props.contractType ?? null,
      contractorName: props.contractorName ?? null,
      addOns: props.addOns ?? [],
      waitingPeriods: props.waitingPeriods ?? [],
      externalKey: props.externalKey,
      source: props.source ?? 'manual',
      raw: props.raw ?? null,
      createdAt: now,
      updatedAt: now,
    })
  }

  static restore(data: InsurancePlanData): InsurancePlan {
    return new InsurancePlan(data)
  }

  get id(): string { return this.data.id }
  get operator(): string { return this.data.operator }
  get operatorName(): string | null { return this.data.operatorName }
  get planName(): string { return this.data.planName }
  get productCode(): string | null { return this.data.productCode }
  get networkName(): string | null { return this.data.networkName }
  get networkCode(): string | null { return this.data.networkCode }
  get segmentation(): string | null { return this.data.segmentation }
  get accommodation(): string | null { return this.data.accommodation }
  get geographicCoverage(): string | null { return this.data.geographicCoverage }
  get regulationType(): string | null { return this.data.regulationType }
  get contractType(): string | null { return this.data.contractType }
  get contractorName(): string | null { return this.data.contractorName }
  get addOns(): PlanAddOn[] { return this.data.addOns }
  get waitingPeriods(): PlanWaitingPeriod[] { return this.data.waitingPeriods }
  get externalKey(): string { return this.data.externalKey }
  get source(): string { return this.data.source }
  get raw(): Record<string, unknown> | null { return this.data.raw }
  get createdAt(): Date { return this.data.createdAt }
  get updatedAt(): Date { return this.data.updatedAt }

  mergeFromPortal(props: Partial<InsurancePlanProps>): void {
    if (props.operatorName !== undefined) this.data.operatorName = props.operatorName ?? null
    if (props.planName) this.data.planName = props.planName
    if (props.productCode !== undefined) this.data.productCode = props.productCode ?? null
    if (props.networkName !== undefined) this.data.networkName = props.networkName ?? null
    if (props.networkCode !== undefined) this.data.networkCode = props.networkCode ?? null
    if (props.segmentation !== undefined) this.data.segmentation = props.segmentation ?? null
    if (props.accommodation !== undefined) this.data.accommodation = props.accommodation ?? null
    if (props.geographicCoverage !== undefined) this.data.geographicCoverage = props.geographicCoverage ?? null
    if (props.regulationType !== undefined) this.data.regulationType = props.regulationType ?? null
    if (props.contractType !== undefined) this.data.contractType = props.contractType ?? null
    if (props.contractorName !== undefined) this.data.contractorName = props.contractorName ?? null
    if (props.addOns !== undefined) this.data.addOns = props.addOns
    if (props.waitingPeriods !== undefined) this.data.waitingPeriods = props.waitingPeriods
    if (props.raw !== undefined) this.data.raw = props.raw
    if (props.source) this.data.source = props.source
    this.data.updatedAt = new Date()
  }

  toJSON(): InsurancePlanData { return { ...this.data, addOns: [...this.data.addOns], waitingPeriods: [...this.data.waitingPeriods] } }
}
