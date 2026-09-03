import type { ExamRepository } from '../../domain/exam/exam.repository.js'
import { Exam } from '../../domain/exam/exam.entity.js'
import { buildExamNotes, parseExamNotes } from '../../domain/exam/exam-notes.js'
import type { PatientRepository } from '../../domain/patient/patient.repository.js'
import type { VaccineRepository } from '../../domain/vaccine/vaccine.repository.js'
import { Vaccine } from '../../domain/vaccine/vaccine.entity.js'
import { buildVaccineNotes, parseVaccineNotes } from '../../domain/hygiene/vaccine-notes.js'
import { pickCanonicalEntityPair } from '../../domain/hygiene/hygiene-canonical-pick.js'
import type {
  HygieneCandidate,
  HygieneCandidateView,
  HygieneResolveDecision,
} from '../../domain/hygiene/hygiene.types.js'
import type { HygieneRepository } from '../../domain/hygiene/hygiene.repository.js'
import { scheduleHygieneResolve } from '../../infrastructure/graph/hygiene-graph.js'

export class HygieneService {
  constructor(
    private readonly hygiene: HygieneRepository,
    private readonly exams: ExamRepository,
    private readonly vaccines: VaccineRepository,
    private readonly patients?: PatientRepository,
  ) {}

  async listPendingForAccount(accountId: string, patientId?: string): Promise<HygieneCandidateView[]> {
    const rows = await this.hygiene.listForAccount(accountId, {
      status: 'pending',
      patientId,
      limit: 100,
    })
    return Promise.all(rows.map((row) => this.enrichCandidate(row)))
  }

  async pendingCount(accountId: string): Promise<number> {
    return this.hygiene.countPending(accountId)
  }

  async resolve(
    accountId: string,
    candidateId: string,
    decision: HygieneResolveDecision,
    resolvedBy: string,
  ): Promise<HygieneCandidateView> {
    const candidate = await this.hygiene.findById(candidateId)
    if (!candidate || candidate.accountId !== accountId) {
      throw new Error('HYGIENE_CANDIDATE_NOT_FOUND')
    }
    const updated = await this.hygiene.resolve(candidateId, decision, resolvedBy)
    if (!updated) throw new Error('HYGIENE_CANDIDATE_NOT_FOUND')

    if (decision === 'same_entity') {
      await this.recordSameEntity(updated, resolvedBy)
    }

    const canonicalPair =
      decision === 'same_entity'
        ? pickCanonicalEntityPair(
            updated.entityType,
            updated.entityIdA,
            updated.entityIdB,
            (await this.loadSource(updated.entityType, updated.entityIdA)) ?? undefined,
            (await this.loadSource(updated.entityType, updated.entityIdB)) ?? undefined,
          )
        : null

    scheduleHygieneResolve({
      patientId: updated.patientId,
      entityType: updated.entityType as 'exam' | 'vaccine',
      entityIdA: updated.entityIdA,
      entityIdB: updated.entityIdB,
      candidateId: updated.id,
      decision,
      canonicalId: canonicalPair?.[0],
      duplicateId: canonicalPair?.[1],
    })

    return this.enrichCandidate(updated)
  }

  private async loadSource(
    entityType: HygieneCandidate['entityType'],
    entityId: string,
  ): Promise<string | null | undefined> {
    if (entityType === 'exam') return (await this.exams.findById(entityId))?.source
    if (entityType === 'vaccine') return (await this.vaccines.findById(entityId))?.source
    return undefined
  }

  private async recordSameEntity(candidate: HygieneCandidate, resolvedBy: string): Promise<void> {
    if (candidate.entityType === 'exam') {
      const a = await this.exams.findById(candidate.entityIdA)
      const b = await this.exams.findById(candidate.entityIdB)
      const [canonicalId, duplicateId] = pickCanonicalEntityPair(
        'exam',
        candidate.entityIdA,
        candidate.entityIdB,
        a?.source,
        b?.source,
      )
      await this.recordExamSameEntity(canonicalId, duplicateId, resolvedBy)
      return
    }
    if (candidate.entityType === 'vaccine') {
      const a = await this.vaccines.findById(candidate.entityIdA)
      const b = await this.vaccines.findById(candidate.entityIdB)
      const [canonicalId, duplicateId] = pickCanonicalEntityPair(
        'vaccine',
        candidate.entityIdA,
        candidate.entityIdB,
        a?.source,
        b?.source,
      )
      await this.recordVaccineSameEntity(canonicalId, duplicateId, resolvedBy)
    }
  }

  private async recordExamSameEntity(
    canonicalId: string,
    duplicateId: string,
    resolvedBy: string,
  ): Promise<void> {
    const dup = await this.exams.findById(duplicateId)
    if (!dup) return
    const { dedup, meta } = parseExamNotes(dup.notes)
    const nextMeta = {
      ...meta,
      hygieneCanonicalId: canonicalId,
      hygieneResolvedBy: resolvedBy,
      hygieneResolvedAt: new Date().toISOString(),
    }
    await this.exams.update(
      Exam.restore({
        ...dup.toJSON(),
        notes: buildExamNotes(dedup, nextMeta),
      }),
    )
  }

  private async recordVaccineSameEntity(
    canonicalId: string,
    duplicateId: string,
    resolvedBy: string,
  ): Promise<void> {
    const dup = await this.vaccines.findById(duplicateId)
    if (!dup) return
    const { text, meta } = parseVaccineNotes(dup.notes)
    const nextMeta = {
      ...meta,
      hygieneCanonicalId: canonicalId,
      hygieneResolvedBy: resolvedBy,
      hygieneResolvedAt: new Date().toISOString(),
    }
    await this.vaccines.update(
      Vaccine.restore({
        ...dup.toJSON(),
        notes: buildVaccineNotes(text, nextMeta) ?? null,
      }),
    )
  }

  private async enrichCandidate(row: HygieneCandidate): Promise<HygieneCandidateView> {
    const patientName = this.patients
      ? (await this.patients.findById(row.patientId))?.name
      : undefined

    if (row.entityType === 'exam') {
      const a = await this.exams.findById(row.entityIdA)
      const b = await this.exams.findById(row.entityIdB)
      return {
        ...row,
        patientName,
        entityA: a?.toJSON() ?? { id: row.entityIdA, missing: true },
        entityB: b?.toJSON() ?? { id: row.entityIdB, missing: true },
      }
    }
    if (row.entityType === 'vaccine') {
      const a = await this.vaccines.findById(row.entityIdA)
      const b = await this.vaccines.findById(row.entityIdB)
      return {
        ...row,
        patientName,
        entityA: a?.toJSON() ?? { id: row.entityIdA, missing: true },
        entityB: b?.toJSON() ?? { id: row.entityIdB, missing: true },
      }
    }
    return { ...row, patientName }
  }
}
