export interface AuthorizationItemProps {
  authorizationId: string
  procedureCode?: string
  procedureDescription: string
  quantityRequested?: number
  quantityAuthorized?: number
  status?: string
  externalProcedureId?: string
  sortOrder?: number
}

export interface AuthorizationItemData {
  id: string
  authorizationId: string
  procedureCode: string | null
  procedureDescription: string
  quantityRequested: number | null
  quantityAuthorized: number | null
  status: string | null
  externalProcedureId: string | null
  sortOrder: number
  createdAt: Date
}

export class AuthorizationItem {
  private constructor(private readonly data: AuthorizationItemData) {}

  static create(props: AuthorizationItemProps, id?: string): AuthorizationItem {
    return new AuthorizationItem({
      id: id ?? crypto.randomUUID(),
      authorizationId: props.authorizationId,
      procedureCode: props.procedureCode ?? null,
      procedureDescription: props.procedureDescription,
      quantityRequested: props.quantityRequested ?? null,
      quantityAuthorized: props.quantityAuthorized ?? null,
      status: props.status ?? null,
      externalProcedureId: props.externalProcedureId ?? null,
      sortOrder: props.sortOrder ?? 0,
      createdAt: new Date(),
    })
  }

  static restore(data: AuthorizationItemData): AuthorizationItem {
    return new AuthorizationItem(data)
  }

  get id(): string { return this.data.id }
  get authorizationId(): string { return this.data.authorizationId }
  get procedureCode(): string | null { return this.data.procedureCode }
  get procedureDescription(): string { return this.data.procedureDescription }
  get quantityRequested(): number | null { return this.data.quantityRequested }
  get quantityAuthorized(): number | null { return this.data.quantityAuthorized }
  get status(): string | null { return this.data.status }
  get externalProcedureId(): string | null { return this.data.externalProcedureId }
  get sortOrder(): number { return this.data.sortOrder }
  get createdAt(): Date { return this.data.createdAt }

  toJSON(): AuthorizationItemData { return { ...this.data } }
}
