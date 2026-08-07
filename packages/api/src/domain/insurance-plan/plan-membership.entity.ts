export interface PlanMembershipProps {
  patientId: string
  insurancePlanId: string
  integrationLinkId?: string
  memberNumber?: string
  role?: string
  status?: string
  cns?: string
  inclusionDate?: Date
  cardValidFrom?: Date
  cardValidTo?: Date
  source?: string
  lastSyncedAt?: Date
}

export interface PlanMembershipData {
  id: string
  patientId: string
  insurancePlanId: string
  integrationLinkId: string | null
  memberNumber: string | null
  role: string
  status: string
  cns: string | null
  inclusionDate: Date | null
  cardValidFrom: Date | null
  cardValidTo: Date | null
  source: string
  lastSyncedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export class PlanMembership {
  private constructor(private readonly data: PlanMembershipData) {}

  static create(props: PlanMembershipProps, id?: string): PlanMembership {
    const now = new Date()
    return new PlanMembership({
      id: id ?? crypto.randomUUID(),
      patientId: props.patientId,
      insurancePlanId: props.insurancePlanId,
      integrationLinkId: props.integrationLinkId ?? null,
      memberNumber: props.memberNumber ?? null,
      role: props.role ?? 'holder',
      status: props.status ?? 'active',
      cns: props.cns ?? null,
      inclusionDate: props.inclusionDate ?? null,
      cardValidFrom: props.cardValidFrom ?? null,
      cardValidTo: props.cardValidTo ?? null,
      source: props.source ?? 'manual',
      lastSyncedAt: props.lastSyncedAt ?? null,
      createdAt: now,
      updatedAt: now,
    })
  }

  static restore(data: PlanMembershipData): PlanMembership {
    return new PlanMembership(data)
  }

  get id(): string { return this.data.id }
  get patientId(): string { return this.data.patientId }
  get insurancePlanId(): string { return this.data.insurancePlanId }
  get integrationLinkId(): string | null { return this.data.integrationLinkId }
  get memberNumber(): string | null { return this.data.memberNumber }
  get role(): string { return this.data.role }
  get status(): string { return this.data.status }
  get cns(): string | null { return this.data.cns }
  get inclusionDate(): Date | null { return this.data.inclusionDate }
  get cardValidFrom(): Date | null { return this.data.cardValidFrom }
  get cardValidTo(): Date | null { return this.data.cardValidTo }
  get source(): string { return this.data.source }
  get lastSyncedAt(): Date | null { return this.data.lastSyncedAt }
  get createdAt(): Date { return this.data.createdAt }
  get updatedAt(): Date { return this.data.updatedAt }

  markSynced(patch?: Partial<PlanMembershipProps>): void {
    if (patch?.memberNumber !== undefined) this.data.memberNumber = patch.memberNumber ?? null
    if (patch?.role) this.data.role = patch.role
    if (patch?.status) this.data.status = patch.status
    if (patch?.cns !== undefined) this.data.cns = patch.cns ?? null
    if (patch?.inclusionDate !== undefined) this.data.inclusionDate = patch.inclusionDate ?? null
    if (patch?.cardValidFrom !== undefined) this.data.cardValidFrom = patch.cardValidFrom ?? null
    if (patch?.cardValidTo !== undefined) this.data.cardValidTo = patch.cardValidTo ?? null
    if (patch?.integrationLinkId !== undefined) this.data.integrationLinkId = patch.integrationLinkId ?? null
    this.data.lastSyncedAt = new Date()
    this.data.updatedAt = new Date()
  }

  toJSON(): PlanMembershipData { return { ...this.data } }
}
