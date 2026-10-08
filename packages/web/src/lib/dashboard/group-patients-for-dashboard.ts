import type { Patient } from '../api.types.js'
import { circleColorForId } from './circle-colors.js'

export type DashboardGroupMode = 'family' | 'age' | 'alpha'

export interface CircleGroupInput {
  id: string
  name: string
  patientIds: string[]
}

export interface PatientCircleMeta {
  circleId: string | null
  circleName: string | null
  circleColor: string
}

export interface FamilyDashboardSection {
  kind: 'family'
  key: string
  title: string
  circleId: string | null
  patients: Patient[]
}

export interface AgeDashboardSection {
  kind: 'age'
  key: string
  category: string
  patients: Patient[]
}

export interface AlphaDashboardSection {
  kind: 'alpha'
  key: string
  title: string
  patients: Patient[]
}

export type DashboardLayoutSection = FamilyDashboardSection | AgeDashboardSection | AlphaDashboardSection

const AGE_ORDER = ['adults', 'adolescents', 'children'] as const

function buildPatientCircleMap(
  circleGroups: CircleGroupInput[],
): Map<string, { circleId: string; circleName: string }> {
  const map = new Map<string, { circleId: string; circleName: string }>()
  for (const g of circleGroups) {
    for (const patientId of g.patientIds) {
      map.set(patientId, { circleId: g.id, circleName: g.name })
    }
  }
  return map
}

export function patientCircleMeta(
  patientId: string,
  circleMap: Map<string, { circleId: string; circleName: string }>,
): PatientCircleMeta {
  const hit = circleMap.get(patientId)
  if (!hit) {
    return { circleId: null, circleName: null, circleColor: circleColorForId(null) }
  }
  return {
    circleId: hit.circleId,
    circleName: hit.circleName,
    circleColor: circleColorForId(hit.circleId),
  }
}

function filterPatientsForLens(
  patients: Patient[],
  circleGroups: CircleGroupInput[],
  activeCircleId: string | null,
  hasMultipleCircles: boolean,
): Patient[] {
  if (!hasMultipleCircles || !activeCircleId) return patients
  const allowed = new Set(
    circleGroups.find((g) => g.id === activeCircleId)?.patientIds ?? [],
  )
  return patients.filter((p) => allowed.has(p.id))
}

function sortByName(list: Patient[]): Patient[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
}

function groupByAge(list: Patient[]): Record<string, Patient[]> {
  return AGE_ORDER.reduce((acc, cat) => {
    const rows = list.filter((p) => p.ageCategory === cat)
    if (rows.length) acc[cat] = rows
    return acc
  }, {} as Record<string, Patient[]>)
}

export interface GroupPatientsOptions {
  mode: DashboardGroupMode
  patients: Patient[]
  circleGroups: CircleGroupInput[]
  hasMultipleCircles: boolean
  activeCircleId: string | null
  unassignedTitle: string
  alphaSectionTitle: string
}

export function groupPatientsForDashboard(options: GroupPatientsOptions): DashboardLayoutSection[] {
  const {
    mode,
    patients,
    circleGroups,
    hasMultipleCircles,
    activeCircleId,
    unassignedTitle,
    alphaSectionTitle,
  } = options

  const scopedPatients = filterPatientsForLens(
    patients,
    circleGroups,
    activeCircleId,
    hasMultipleCircles,
  )
  const patientMap = new Map(scopedPatients.map((p) => [p.id, p]))
  const circleMap = buildPatientCircleMap(circleGroups)

  if (mode === 'alpha') {
    return [
      {
        kind: 'alpha',
        key: 'all',
        title: alphaSectionTitle,
        patients: sortByName(scopedPatients),
      },
    ]
  }

  if (mode === 'age') {
    const byAge = groupByAge(scopedPatients)
    return AGE_ORDER
      .filter((cat) => byAge[cat]?.length)
      .map((cat) => ({
        kind: 'age' as const,
        key: cat,
        category: cat,
        patients: sortByName(byAge[cat]),
      }))
  }

  const assigned = new Set<string>()
  const sections: FamilyDashboardSection[] = []

  const visibleCircles =
    hasMultipleCircles && activeCircleId
      ? circleGroups.filter((g) => g.id === activeCircleId)
      : circleGroups

  for (const g of visibleCircles) {
    const list = g.patientIds
      .map((id) => patientMap.get(id))
      .filter(Boolean) as Patient[]
    list.forEach((p) => assigned.add(p.id))
    if (list.length) {
      sections.push({
        kind: 'family',
        key: g.id,
        title: g.name,
        circleId: g.id,
        patients: sortByName(list),
      })
    }
  }

  const unassigned = scopedPatients.filter((p) => !assigned.has(p.id))
  if (unassigned.length) {
    sections.push({
      kind: 'family',
      key: 'unassigned',
      title: unassignedTitle,
      circleId: null,
      patients: sortByName(unassigned),
    })
  }

  return sections
}

export { AGE_ORDER, groupByAge }
