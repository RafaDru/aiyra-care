import type { Patient } from '../../domain/patient/patient.entity.js'
import type { ScrapedChildImportBundle, ScrapedFamilyMember } from '../../domain/scraper/scraper-types.js'

export type CadernetaMatchReason = 'cpf' | 'cns' | 'birth_date_name' | 'name_only' | 'unmatched'

export interface CadernetaPatientMatch {
  patientId: string
  patientName: string
  bundle: ScrapedChildImportBundle
  matchReason: CadernetaMatchReason
}

export interface CadernetaUnmatchedBundle {
  bundle: ScrapedChildImportBundle
  reason: string
}

export interface CadernetaFamilyImportPlan {
  anchorPatientId: string
  responsibleCpf?: string
  familyPatientIds: string[]
  matches: CadernetaPatientMatch[]
  unmatched: CadernetaUnmatchedBundle[]
}

function digits(value?: string | null): string {
  return (value ?? '').replace(/\D/g, '')
}

function normalizeDate(value?: string | Date | null): string | undefined {
  if (!value) return undefined
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  const d = String(value).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined
}

function namesLooselyEqual(a?: string, b?: string): boolean {
  if (!a || !b) return false
  const na = a.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  const nb = b.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  if (na === nb) return true
  const aFirst = na.split(/\s+/)[0]
  const bFirst = nb.split(/\s+/)[0]
  return aFirst.length >= 3 && aFirst === bFirst
}

/** Pacientes-filhos no app vinculados ao mesmo núcleo familiar que o paciente âncora. */
export function resolveFamilyChildPatients(anchor: Patient, allPatients: Patient[]): Patient[] {
  const asParent = allPatients.filter((p) => p.parentIds.includes(anchor.id))
  if (asParent.length > 0) return asParent

  if (anchor.parentIds.length > 0) {
    const parentSet = new Set(anchor.parentIds)
    return allPatients.filter((p) => p.parentIds.some((id) => parentSet.has(id)))
  }

  if (anchor.ageCategory === 'children' || anchor.ageCategory === 'adolescents') {
    return [anchor]
  }

  return []
}

function scoreMemberToPatient(member: ScrapedFamilyMember, patient: Patient): CadernetaMatchReason | null {
  const memberCpf = digits(member.cpf)
  const patientCpf = digits(patient.cpf)
  if (memberCpf.length === 11 && patientCpf.length === 11 && memberCpf === patientCpf) return 'cpf'

  const memberCns = digits(member.cns)
  const patientCns = digits(patient.cns)
  if (memberCns.length >= 15 && patientCns.length >= 15 && memberCns === patientCns) return 'cns'

  const memberBirth = normalizeDate(member.birthDate)
  const patientBirth = normalizeDate(patient.birthDate)
  if (memberBirth && patientBirth && memberBirth === patientBirth && namesLooselyEqual(member.name, patient.name)) {
    return 'birth_date_name'
  }

  if (namesLooselyEqual(member.name, patient.name)) return 'name_only'

  return null
}

export function planCadernetaFamilyImport(
  anchorPatientId: string,
  anchor: Patient,
  allPatients: Patient[],
  bundles: ScrapedChildImportBundle[],
  responsibleCpf?: string,
): CadernetaFamilyImportPlan {
  const familyPatients = resolveFamilyChildPatients(anchor, allPatients)
  const matches: CadernetaPatientMatch[] = []
  const unmatched: CadernetaUnmatchedBundle[] = []
  const usedPatientIds = new Set<string>()

  const reasonPriority: Record<CadernetaMatchReason, number> = {
    cpf: 4,
    cns: 3,
    birth_date_name: 2,
    name_only: 1,
    unmatched: 0,
  }

  for (const bundle of bundles) {
    let best: { patient: Patient; reason: CadernetaMatchReason } | null = null

    for (const patient of familyPatients) {
      if (usedPatientIds.has(patient.id)) continue
      const reason = scoreMemberToPatient(bundle.member, patient)
      if (!reason) continue
      if (!best || reasonPriority[reason] > reasonPriority[best.reason]) {
        best = { patient, reason }
      }
    }

    if (best) {
      usedPatientIds.add(best.patient.id)
      matches.push({
        patientId: best.patient.id,
        patientName: best.patient.name,
        bundle,
        matchReason: best.reason,
      })
    } else {
      const label = bundle.member.name ?? bundle.member.cpf ?? 'Dependente'
      unmatched.push({
        bundle,
        reason: `Sem correspondência no app para «${label}». Cadastre o filho e vincule ao responsável.`,
      })
    }
  }

  return {
    anchorPatientId,
    responsibleCpf,
    familyPatientIds: familyPatients.map((p) => p.id),
    matches,
    unmatched,
  }
}
