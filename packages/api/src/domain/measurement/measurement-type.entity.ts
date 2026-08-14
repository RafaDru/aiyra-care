export type MeasurementCategory =
  | 'anthropometry'
  | 'vital_sign'
  | 'lab_point'
  | 'symptom'
  | 'derived'

export type MeasurementValueKind = 'scalar' | 'composite' | 'occurrence'

export type MeasurementChartConfig = {
  enabled?: boolean
  chartKind?: 'line' | 'area' | 'dual-line' | 'dual-axis'
  color?: string
  yAxisGroup?: string
  components?: { code: string; color?: string; labelKey?: string }[]
}

export type MeasurementNormalRange = {
  min?: number
  max?: number
  criticalLow?: number
  criticalHigh?: number
}

export interface MeasurementTypeData {
  code: string
  category: MeasurementCategory
  labelKey: string
  defaultUnit: string | null
  valueKind: MeasurementValueKind
  precision: number
  normalRange: MeasurementNormalRange | null
  chartConfig: MeasurementChartConfig
  sortOrder: number
  active: boolean
}

export class MeasurementType {
  private constructor(private readonly data: MeasurementTypeData) {}

  static restore(data: MeasurementTypeData): MeasurementType {
    return new MeasurementType(data)
  }

  get code(): string { return this.data.code }
  get category(): MeasurementCategory { return this.data.category }
  get labelKey(): string { return this.data.labelKey }
  get defaultUnit(): string | null { return this.data.defaultUnit }
  get valueKind(): MeasurementValueKind { return this.data.valueKind }
  get precision(): number { return this.data.precision }
  get normalRange(): MeasurementNormalRange | null { return this.data.normalRange }
  get chartConfig(): MeasurementChartConfig { return this.data.chartConfig }
  get sortOrder(): number { return this.data.sortOrder }
  get active(): boolean { return this.data.active }

  toJSON(): MeasurementTypeData { return { ...this.data } }
}
