import { NotFoundError } from '../../domain/errors.js'
import type { WhoGrowthService } from './who-growth.service.js'
import type { MeasurementRepository } from '../../domain/measurement/measurement.repository.js'
import { MeasurementObservation } from '../../domain/measurement/measurement-observation.entity.js'
import type { MeasurementObservationProps } from '../../domain/measurement/measurement-observation.entity.js'
import { MedicationAdministration } from '../../domain/measurement/medication-administration.entity.js'
import type { MedicationAdministrationProps } from '../../domain/measurement/medication-administration.entity.js'

export type ChartSeriesPoint = {
  observedAt: Date
  value: number | null
  valueSecondary: number | null
  notes: string | null
  healthThreadId: string | null
}

export type ChartSeriesPayload = {
  typeCode: string
  labelKey: string
  category: string
  unit: string | null
  valueKind: string
  chartConfig: Record<string, unknown>
  normalRange: Record<string, unknown> | null
  points: ChartSeriesPoint[]
}

export class MeasurementService {
  constructor(
    private readonly repo: MeasurementRepository,
    private readonly whoGrowth?: WhoGrowthService,
  ) {}

  listTypes() {
    return this.repo.listTypes(true)
  }

  async createObservation(data: MeasurementObservationProps) {
    const type = await this.repo.findTypeByCode(data.typeCode)
    if (!type) throw new NotFoundError('MeasurementType', data.typeCode)

    if (type.valueKind === 'occurrence') {
      data.valueNumeric = data.valueNumeric ?? 1
    }

    const unit = data.unit ?? type.defaultUnit
    let context = data.context ?? {}
    if (this.whoGrowth && data.valueNumeric != null) {
      context = await this.whoGrowth.enrichContext(
        data.patientId,
        data.typeCode,
        data.observedAt,
        data.valueNumeric,
        context,
      )
    }
    const obs = MeasurementObservation.create({ ...data, unit, context })
    return this.repo.saveObservation(obs)
  }

  async createObservationBatch(
    patientId: string,
    observedAt: Date,
    items: Array<{
      typeCode: string
      valueNumeric?: number | null
      valueSecondary?: number | null
      unit?: string | null
      notes?: string | null
      context?: Record<string, unknown>
    }>,
    opts?: { healthThreadId?: string | null },
  ) {
    const saved: MeasurementObservation[] = []
    for (const item of items) {
      if (item.valueNumeric == null && item.valueSecondary == null && !item.notes) continue
      const row = await this.createObservation({
        patientId,
        typeCode: item.typeCode,
        observedAt,
        valueNumeric: item.valueNumeric,
        valueSecondary: item.valueSecondary,
        unit: item.unit,
        notes: item.notes,
        context: item.context,
        healthThreadId: opts?.healthThreadId ?? null,
        source: 'manual',
      })
      saved.push(row)
    }
    return saved
  }

  async findObservationById(id: string) {
    const row = await this.repo.findObservationById(id)
    if (!row) throw new NotFoundError('MeasurementObservation', id)
    return row
  }

  findObservations(filter: Parameters<MeasurementRepository['findObservations']>[0]) {
    return this.repo.findObservations(filter)
  }

  async deleteObservation(id: string) {
    await this.findObservationById(id)
    await this.repo.deleteObservation(id)
  }

  async chartSeries(
    patientId: string,
    opts?: { from?: Date; to?: Date; healthThreadId?: string; categories?: string[] },
  ): Promise<ChartSeriesPayload[]> {
    const types = await this.repo.listTypes(true)
    const filteredTypes = opts?.categories?.length
      ? types.filter((t) => opts.categories!.includes(t.category))
      : types

    const observations = await this.repo.findObservations({
      patientId,
      from: opts?.from,
      to: opts?.to,
      healthThreadId: opts?.healthThreadId,
    })

    const byType = new Map<string, MeasurementObservation[]>()
    for (const obs of observations) {
      const list = byType.get(obs.typeCode) ?? []
      list.push(obs)
      byType.set(obs.typeCode, list)
    }

    const series: ChartSeriesPayload[] = []
    for (const type of filteredTypes) {
      const cfg = type.chartConfig
      if (!cfg.enabled) continue
      const rows = byType.get(type.code) ?? []
      if (!rows.length) continue
      const points = rows
        .sort((a, b) => a.observedAt.getTime() - b.observedAt.getTime())
        .map((o) => ({
          observedAt: o.observedAt,
          value: o.valueNumeric,
          valueSecondary: o.valueSecondary,
          notes: o.notes,
          healthThreadId: o.healthThreadId,
        }))
      series.push({
        typeCode: type.code,
        labelKey: type.labelKey,
        category: type.category,
        unit: type.defaultUnit,
        valueKind: type.valueKind,
        chartConfig: cfg as Record<string, unknown>,
        normalRange: type.normalRange as Record<string, unknown> | null,
        points,
      })
    }
    return series
  }

  async createAdministration(data: MedicationAdministrationProps) {
    const row = MedicationAdministration.create(data)
    return this.repo.saveAdministration(row)
  }

  async findAdministrationById(id: string) {
    const row = await this.repo.findAdministrationById(id)
    if (!row) throw new NotFoundError('MedicationAdministration', id)
    return row
  }

  findAdministrations(filter: Parameters<MeasurementRepository['findAdministrations']>[0]) {
    return this.repo.findAdministrations(filter)
  }

  async deleteAdministration(id: string) {
    await this.findAdministrationById(id)
    await this.repo.deleteAdministration(id)
  }

  async monitoringTimeline(
    patientId: string,
    opts?: { from?: Date; to?: Date; healthThreadId?: string },
  ) {
    const observations = await this.repo.findObservations({
      patientId,
      from: opts?.from,
      to: opts?.to,
      healthThreadId: opts?.healthThreadId,
    })
    const administrations = await this.repo.findAdministrations({
      patientId,
      from: opts?.from,
      to: opts?.to,
      healthThreadId: opts?.healthThreadId,
    })
    const types = await this.repo.listTypes(true)
    const typeMap = new Map(types.map((t) => [t.code, t]))

    type TimelineRow = {
      kind: 'measurement' | 'medication' | 'symptom'
      at: Date
      id: string
      labelKey: string
      display: string
      healthThreadId: string | null
      notes: string | null
    }

    const rows: TimelineRow[] = []

    for (const o of observations) {
      const t = typeMap.get(o.typeCode)
      const labelKey = t?.labelKey ?? o.typeCode
      let display = ''
      if (t?.valueKind === 'occurrence') {
        display = labelKey
      } else if (o.typeCode === 'blood_pressure' && o.valueNumeric != null) {
        display = `${o.valueNumeric}/${o.valueSecondary ?? '—'} ${o.unit ?? 'mmHg'}`
      } else if (o.valueNumeric != null) {
        display = `${o.valueNumeric}${o.unit ? ` ${o.unit}` : ''}`
      }
      rows.push({
        kind: t?.category === 'symptom' ? 'symptom' : 'measurement',
        at: o.observedAt,
        id: o.id,
        labelKey,
        display,
        healthThreadId: o.healthThreadId,
        notes: o.notes,
      })
    }

    for (const a of administrations) {
      rows.push({
        kind: 'medication',
        at: a.administeredAt,
        id: a.id,
        labelKey: 'measurement.medication.given',
        display: a.doseGiven ? `${a.medicationName} (${a.doseGiven})` : a.medicationName,
        healthThreadId: a.healthThreadId,
        notes: a.notes,
      })
    }

    rows.sort((a, b) => b.at.getTime() - a.at.getTime())
    return rows
  }

  async buildMonitoringExport(
    patientId: string,
    opts?: { healthThreadId?: string; from?: Date; to?: Date; patientName?: string; threadTitle?: string },
  ) {
    const timeline = await this.monitoringTimeline(patientId, opts)
    const series = await this.chartSeries(patientId, {
      healthThreadId: opts?.healthThreadId,
      from: opts?.from,
      to: opts?.to,
    })

    type Stat = { typeCode: string; labelKey: string; unit: string | null; count: number; min: number | null; max: number | null; last: number | null; lastAt: string | null }
    const stats: Stat[] = []

    for (const s of series) {
      const values = s.points.map((p) => p.value).filter((v): v is number => v != null)
      if (!values.length) continue
      const lastPoint = s.points[s.points.length - 1]
      stats.push({
        typeCode: s.typeCode,
        labelKey: s.labelKey,
        unit: s.unit,
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        last: lastPoint?.value ?? null,
        lastAt: lastPoint?.observedAt ? new Date(lastPoint.observedAt).toISOString() : null,
      })
    }

    const types = await this.repo.listTypes(true)
    const alerts: Array<{ typeCode: string; labelKey: string; value: number; message: string }> = []
    for (const s of series) {
      const type = types.find((t) => t.code === s.typeCode)
      const range = type?.normalRange
      if (!range) continue
      for (const p of s.points) {
        if (p.value == null) continue
        if (range.criticalHigh != null && p.value >= range.criticalHigh) {
          alerts.push({ typeCode: s.typeCode, labelKey: s.labelKey, value: p.value, message: 'above_critical' })
        } else if (range.criticalLow != null && p.value <= range.criticalLow) {
          alerts.push({ typeCode: s.typeCode, labelKey: s.labelKey, value: p.value, message: 'below_critical' })
        }
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      patientId,
      patientName: opts?.patientName ?? null,
      healthThreadId: opts?.healthThreadId ?? null,
      threadTitle: opts?.threadTitle ?? null,
      timeline: timeline.map((r) => ({
        ...r,
        at: r.at.toISOString(),
      })),
      series,
      stats,
      alerts: alerts.slice(0, 20),
    }
  }
}
