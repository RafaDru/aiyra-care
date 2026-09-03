export type OrganizationKind = 'clinic' | 'lab' | 'pharmacy' | 'plan' | 'other'
export type OrganizationMemberRole = 'admin' | 'clinician' | 'read_only'

export interface OrganizationProps {
  name: string
  kind: OrganizationKind
}

export interface OrganizationData {
  id: string
  name: string
  kind: OrganizationKind
  createdAt: Date
  updatedAt: Date
}

export class Organization {
  private constructor(private readonly data: OrganizationData) {}

  static create(props: OrganizationProps, id?: string): Organization {
    return new Organization({
      id: id ?? crypto.randomUUID(),
      name: props.name.trim(),
      kind: props.kind,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static restore(data: OrganizationData): Organization {
    return new Organization(data)
  }

  toJSON(): OrganizationData {
    return { ...this.data }
  }
}
