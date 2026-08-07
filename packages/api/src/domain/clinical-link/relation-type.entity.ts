export interface RelationTypeData {
  code: string
  label: string
  fromEntityType: string
  toEntityType: string
  neo4jRelType: string
  description: string | null
  inverseLabel: string | null
}

export class RelationType {
  constructor(private readonly data: RelationTypeData) {}

  get code(): string { return this.data.code }
  get label(): string { return this.data.label }
  get fromEntityType(): string { return this.data.fromEntityType }
  get toEntityType(): string { return this.data.toEntityType }
  get neo4jRelType(): string { return this.data.neo4jRelType }
  get description(): string | null { return this.data.description }
  get inverseLabel(): string | null { return this.data.inverseLabel }

  matches(fromType: string, toType: string): boolean {
    if (this.data.fromEntityType === 'clinical_entity' && this.data.toEntityType === 'clinical_entity') {
      return true
    }
    return this.data.fromEntityType === fromType && this.data.toEntityType === toType
  }

  toJSON(): RelationTypeData {
    return { ...this.data }
  }

  static restore(data: RelationTypeData): RelationType {
    return new RelationType(data)
  }
}
