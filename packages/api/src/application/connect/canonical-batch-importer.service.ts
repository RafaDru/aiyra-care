import type { Pool } from 'pg'
import type { CanonicalSyncBatch, CanonicalRecord } from '@open-health/connect'
import { canonicalSyncBatchSchema } from '@open-health/connect'
import { Authorization } from '../../domain/authorization/authorization.entity.js'
import { AuthorizationItem } from '../../domain/authorization/authorization-item.entity.js'
import { Exam } from '../../domain/exam/exam.entity.js'
import { MedicalRecord } from '../../domain/medical-record/medical-record.entity.js'
import { InsurancePlanService } from '../insurance-plan/insurance-plan.service.js'
import { ImportLineageService } from '../import-lineage/import-lineage.service.js'
import { AuthorizationPgRepository } from '../../infrastructure/persistence/authorization.pg.repository.js'
import { ExamPgRepository } from '../../infrastructure/persistence/exam.pg.repository.js'
import { MedicalRecordPgRepository } from '../../infrastructure/persistence/medical-record.pg.repository.js'
import { InsurancePlanPgRepository } from '../../infrastructure/persistence/insurance-plan.pg.repository.js'
import { PlanMembershipPgRepository } from '../../infrastructure/persistence/plan-membership.pg.repository.js'
import { ImportLineagePgRepository } from '../../infrastructure/persistence/import-lineage.pg.repository.js'
import type { SyncAuthorizationDetail, SyncBeneficiaryDetail, SyncUnmatchedBeneficiary } from '../../infrastructure/scraper/sync-progress-store.js'
import type { UnimedBhAuthorizationItem } from '../../infrastructure/scraper/unimedbh-autorizacoes.scraper.js'
import type { UnimedBhUsageItem } from '../../infrastructure/scraper/unimedbh-extrato.scraper.js'
import type { UnimedBhVirtualCard } from '../../infrastructure/scraper/unimedbh-cartao-virtual.scraper.js'
import type { AmilAuthorizationItem } from '../../infrastructure/scraper/amil-sync.scraper.js'
import type { PortalPlanSnapshot } from '../insurance-plan/insurance-plan.service.js'
import {
  buildHouseholdCandidates,
  matchAmilBeneficiaryToPatient,
  type MatchablePatient,
} from '../insurance-plan/amil-beneficiary-matcher.js'
import { PatientPgRepository } from '../../infrastructure/persistence/patient.pg.repository.js'
import {
  findOriginatingConsulta,
  normalizeName,
  parseDate,
  parseFlexibleDate,
} from './connect-sync.helpers.js'

export interface CanonicalImportOutcome {
  imported: number
  updated: number
  skipped: number
  skippedMedicalRecords: number
  skippedExams: number
  skippedAuthorizations: number
  exams: number
  medicalRecords: number
  authorizations: number
  authorizationItems: number
  updatedAuthorizations: number
  authorizationDetails: SyncAuthorizationDetail[]
  beneficiaryDetails?: SyncBeneficiaryDetail[]
  unmatchedBeneficiaries?: SyncUnmatchedBeneficiary[]
  cardNumberHint?: string | null
}

function emptyImportOutcome(): CanonicalImportOutcome {
  return {
    imported: 0,
    updated: 0,
    skipped: 0,
    skippedMedicalRecords: 0,
    skippedExams: 0,
    skippedAuthorizations: 0,
    exams: 0,
    medicalRecords: 0,
    authorizations: 0,
    authorizationItems: 0,
    updatedAuthorizations: 0,
    authorizationDetails: [],
  }
}

export class CanonicalBatchImporterService {
  private readonly lineage: ImportLineageService
  private readonly examRepo: ExamPgRepository
  private readonly recordRepo: MedicalRecordPgRepository
  private readonly authRepo: AuthorizationPgRepository
  private readonly planService: InsurancePlanService

  constructor(private readonly pool: Pool) {
    this.lineage = new ImportLineageService(new ImportLineagePgRepository(pool))
    this.examRepo = new ExamPgRepository(pool)
    this.recordRepo = new MedicalRecordPgRepository(pool)
    this.authRepo = new AuthorizationPgRepository(pool)
    this.planService = new InsurancePlanService(
      new InsurancePlanPgRepository(pool),
      new PlanMembershipPgRepository(pool),
    )
  }

  async ingestBatch(
    batch: CanonicalSyncBatch,
    patientId: string,
    integrationLinkId?: string,
  ): Promise<CanonicalImportOutcome> {
    const parsed = canonicalSyncBatchSchema.safeParse(batch)
    if (!parsed.success) {
      throw new Error(`Batch inválido: ${parsed.error.message}`)
    }

    if (parsed.data.connectorId === 'unimed_bh') {
      return this.ingestUnimedBatch(parsed.data, patientId, integrationLinkId)
    }

    if (parsed.data.connectorId === 'amil_beneficiario') {
      return this.ingestAmilBatch(parsed.data, patientId, integrationLinkId)
    }

    const skipped = parsed.data.records.length
    return { ...emptyImportOutcome(), skipped }
  }

  private async ingestUnimedBatch(
    batch: CanonicalSyncBatch,
    patientId: string,
    integrationLinkId?: string,
  ): Promise<CanonicalImportOutcome> {
    const batchId = await this.lineage.startBatch({
      patientId,
      source: 'unimed',
      portal: 'unimed_bh',
      status: 'running',
    })

    const outcome = emptyImportOutcome()

    const existingExams = await this.examRepo.findAll({ patientId })
    const existingAuths = await this.authRepo.findAll({ patientId })
    const existingRecords = await this.recordRepo.findAll({ patientId })

    const examKey = (e: typeof existingExams[0]) =>
      `${e.examType}|${e.examDate.toISOString().slice(0, 10)}`
    const existingExamKeys = new Set(existingExams.map(examKey))

    const recordKey = (r: typeof existingRecords[0]) => {
      const date = r.recordDate.toISOString().slice(0, 10)
      if (r.invoiceNumber) return `inv:${r.invoiceNumber}`
      if (r.providerExternalId) return `prov:${r.providerExternalId}|${date}|${r.description || ''}`
      return `${date}|${normalizeName(r.doctorName)}|${r.description || ''}`
    }
    const existingRecordKeys = new Set(existingRecords.map(recordKey))
    const savedConsultas: typeof existingRecords = [...existingRecords]

    const authBySolicitation = new Map(
      existingAuths.filter((a) => a.solicitationNumber).map((a) => [a.solicitationNumber!, a]),
    )
    const authByLegacy = new Map(
      existingAuths.map((a) => [`${a.procedureCode || ''}|${a.guideNumber || ''}`, a]),
    )

    for (const record of batch.records) {
      try {
        if (record.type === 'medical_record') {
          const n = await this.importUnimedMedicalRecord(
            record,
            patientId,
            batchId,
            existingRecordKeys,
            recordKey,
            savedConsultas,
          )
          if (n) {
            outcome.medicalRecords++
            outcome.imported++
          } else {
            outcome.skipped++
            outcome.skippedMedicalRecords++
          }
        } else if (record.type === 'exam') {
          const n = await this.importUnimedExam(record, patientId, batchId, existingExamKeys, examKey)
          if (n) {
            outcome.exams++
            outcome.imported++
          } else {
            outcome.skipped++
            outcome.skippedExams++
          }
        } else if (record.type === 'authorization') {
          const r = await this.importUnimedAuthorization(
            record,
            patientId,
            batchId,
            savedConsultas,
            authBySolicitation,
            authByLegacy,
          )
          outcome.authorizations += r.imported
          outcome.updatedAuthorizations += r.updated
          outcome.authorizationItems += r.items
          outcome.imported += r.imported
          outcome.updated += r.updated
          outcome.authorizationDetails.push(...r.details)
          if (!r.imported && !r.updated) {
            outcome.skipped++
            outcome.skippedAuthorizations++
          }
        } else if (record.type === 'coverage') {
          const card = record.raw as UnimedBhVirtualCard | undefined
          if (card) {
            await this.planService.upsertFromPortal(patientId, {
              operator: 'unimed',
              operatorName: card.operatorName || 'Unimed BH',
              planName: card.planName || 'Plano Unimed BH',
              productCode: card.productCode || undefined,
              networkName: card.networkName || undefined,
              segmentation: card.segmentation || undefined,
              accommodation: card.accommodation || undefined,
              geographicCoverage: card.geographicCoverage || undefined,
              regulationType: card.regulationType || undefined,
              contractType: card.contractType || undefined,
              contractorName: card.contractorName || undefined,
              addOns: card.addOns,
              externalKey: card.externalKey,
              source: 'unimed',
              raw: card.raw,
              memberNumber: card.cardNumber || undefined,
              role: 'holder',
              status: 'active',
              cns: card.cns || undefined,
              inclusionDate: card.inclusionDate ? new Date(card.inclusionDate) : null,
              cardValidFrom: card.cardValidFrom ? new Date(card.cardValidFrom) : null,
              cardValidTo: card.cardValidTo ? new Date(card.cardValidTo) : null,
            }, integrationLinkId)
            if (card.cardNumber) outcome.cardNumberHint = card.cardNumber
          }
        }
      } catch {
        outcome.skipped++
      }
    }

    await this.lineage.completeBatch(batchId, {
      connectorId: batch.connectorId,
      jobId: batch.jobId,
      ...outcome,
    })

    return outcome
  }

  private async importUnimedMedicalRecord(
    record: CanonicalRecord & { type: 'medical_record' },
    patientId: string,
    batchId: string,
    existingRecordKeys: Set<string>,
    recordKeyFn: (r: MedicalRecord) => string,
    savedConsultas: MedicalRecord[],
  ): Promise<boolean> {
    const item = record.raw as UnimedBhUsageItem | undefined
    const parsedDate = parseDate(record.date || item?.procedureDate || '')
    if (!parsedDate) return false

    const draft = MedicalRecord.create({
      patientId,
      recordDate: parsedDate,
      recordType: record.recordType || item?.kind || 'outro',
      doctorName: item?.doctorName || undefined,
      clinicName: 'Unimed BH',
      description: record.description || item?.procedureDescription || undefined,
      notes: item
        ? [
            item.value ? `Valor: ${item.value}` : null,
            item.invoiceNumber ? `Nota: ${item.invoiceNumber}` : null,
            item.copartCompanyAmount != null ? `Copart empresa: ${item.copartCompanyAmount}` : null,
            item.copartBaseAmount != null ? `Base copart: ${item.copartBaseAmount}` : null,
          ]
            .filter(Boolean)
            .join(' | ') || undefined
        : undefined,
      source: 'unimed',
      invoiceNumber: item?.invoiceNumber || undefined,
      chargedAmount: item?.chargedAmount,
      copartCompanyAmount: item?.copartCompanyAmount,
      copartBaseAmount: item?.copartBaseAmount,
      providerExternalId: item?.providerExternalId,
      procedureExternalId: item?.procedureExternalId,
    })

    const key = recordKeyFn(draft)
    if (existingRecordKeys.has(key)) return false

    const saved = await this.recordRepo.save(draft)
    existingRecordKeys.add(key)
    savedConsultas.push(saved)
    await this.lineage.recordRaw({
      batchId,
      patientId,
      source: 'unimed',
      recordType: 'clinical_record',
      externalKey: record.externalKey,
      rawJson: (record.raw as Record<string, unknown>) ?? {},
      processed: { table: 'medical_records', id: saved.id },
    })
    return true
  }

  private async importUnimedExam(
    record: CanonicalRecord & { type: 'exam' },
    patientId: string,
    batchId: string,
    existingExamKeys: Set<string>,
    examKeyFn: (e: Exam) => string,
  ): Promise<boolean> {
    const item = record.raw as UnimedBhUsageItem | undefined
    const parsedDate = parseDate(record.performedAt || item?.procedureDate || '')
    if (!parsedDate || !record.name) return false

    const draft = Exam.create({
      patientId,
      examType: record.name,
      examDate: parsedDate,
      laboratory: record.laboratory || item?.doctorName || undefined,
      notes: item
        ? [item.value ? `Valor: ${item.value}` : null, item.invoiceNumber ? `Nota: ${item.invoiceNumber}` : null]
            .filter(Boolean)
            .join(' | ') || undefined
        : undefined,
      source: 'unimed',
    })

    const key = examKeyFn(draft)
    if (existingExamKeys.has(key)) return false

    const saved = await this.examRepo.save(draft)
    existingExamKeys.add(key)
    await this.lineage.recordRaw({
      batchId,
      patientId,
      source: 'unimed',
      recordType: 'exam',
      externalKey: record.externalKey,
      rawJson: (record.raw as Record<string, unknown>) ?? {},
      processed: { table: 'exams', id: saved.id },
    })
    return true
  }

  private async importUnimedAuthorization(
    record: CanonicalRecord & { type: 'authorization' },
    patientId: string,
    batchId: string,
    savedConsultas: MedicalRecord[],
    authBySolicitation: Map<string, Authorization>,
    authByLegacy: Map<string, Authorization>,
  ): Promise<{
    imported: number
    updated: number
    items: number
    details: SyncAuthorizationDetail[]
  }> {
    const item = record.raw as UnimedBhAuthorizationItem | undefined
    if (!item) return { imported: 0, updated: 0, items: 0, details: [] }

    const solicitationNumber = item.solicitationNumber || item.guideNumber || ''
    const legacyKey = `${item.procedureCode || ''}|${item.guideNumber || ''}`
    const existing =
      (solicitationNumber && authBySolicitation.get(solicitationNumber))
      || (legacyKey !== '|' ? authByLegacy.get(legacyKey) : undefined)

    const authDate = parseDate(item.authorizationDate)
    const linkedConsulta = findOriginatingConsulta(savedConsultas, {
      providerExternalId: item.providerExternalId,
      doctorName: item.doctorName,
      authorizationDate: authDate,
    })

    const props = {
      patientId,
      procedureCode: item.procedureCode || undefined,
      procedureDescription: item.procedureDescription || item.classification || undefined,
      doctorName: item.doctorName || undefined,
      doctorCouncil: item.doctorCouncil || undefined,
      clinicName: item.clinicName || item.localAddress || undefined,
      authorizationDate: authDate ?? undefined,
      validityDate: parseDate(item.validityDate) ?? undefined,
      status: item.status || 'authorized',
      guideNumber: item.guideNumber || solicitationNumber || undefined,
      quantity: item.items?.length || (item.quantity ? Number(item.quantity) : undefined),
      source: 'unimed',
      solicitationNumber: solicitationNumber || undefined,
      guidePassword: item.guidePassword || undefined,
      specialty: item.specialty || undefined,
      solicitationUrl: item.solicitationUrl || undefined,
      solicId: item.solicId || undefined,
      solicIdEncrypted: item.solicIdEncrypted || undefined,
      authorizationType: item.authorizationType || undefined,
      classification: item.classification || undefined,
      localAddress: item.localAddress || undefined,
      localPhone: item.localPhone || undefined,
      locations: item.locations,
      history: item.history,
      medicalRecordId: linkedConsulta?.id,
      providerExternalId: item.providerExternalId,
    }

    let saved: Authorization
    let action: 'created' | 'updated'
    let imported = 0
    let updated = 0

    if (existing) {
      saved = await this.authRepo.update(
        Authorization.restore({
          ...existing.toJSON(),
          ...Authorization.create(props, existing.id).toJSON(),
          id: existing.id,
          createdAt: existing.createdAt,
          items: existing.items,
          medicalRecordId: linkedConsulta?.id ?? existing.medicalRecordId,
        }),
      )
      updated = 1
      action = 'updated'
    } else {
      saved = await this.authRepo.save(Authorization.create(props))
      imported = 1
      action = 'created'
      if (solicitationNumber) authBySolicitation.set(solicitationNumber, saved)
    }

    const childItems = (item.items ?? []).map((proc, idx) =>
      AuthorizationItem.create({
        authorizationId: saved.id,
        procedureCode: proc.procedureCode,
        procedureDescription: proc.procedureDescription,
        quantityRequested: proc.quantityRequested,
        quantityAuthorized: proc.quantityAuthorized,
        status: proc.status,
        externalProcedureId: proc.externalProcedureId,
        sortOrder: idx,
      }),
    )
    let itemCount = 0
    if (childItems.length) {
      await this.authRepo.replaceItems(saved.id, childItems)
      itemCount = childItems.length
    }

    await this.lineage.recordRaw({
      batchId,
      patientId,
      source: 'unimed',
      recordType: 'authorization',
      externalKey: record.externalKey,
      rawJson: item as unknown as Record<string, unknown>,
      processed: { table: 'authorizations', id: saved.id },
    })

    return {
      imported,
      updated,
      items: itemCount,
      details: [{
        solicitationNumber: solicitationNumber || undefined,
        classification: item.classification || item.procedureDescription || undefined,
        doctorName: item.doctorName || undefined,
        itemCount,
        action,
        linkedConsultaId: linkedConsulta?.id,
        linkedConsultaDate: linkedConsulta?.recordDate?.toISOString().slice(0, 10),
      }],
    }
  }

  private async ingestAmilBatch(
    batch: CanonicalSyncBatch,
    linkPatientId: string,
    integrationLinkId?: string,
  ): Promise<CanonicalImportOutcome> {
    const batchId = await this.lineage.startBatch({
      patientId: linkPatientId,
      source: 'amil',
      portal: 'amil',
      status: 'running',
    })

    const outcome: CanonicalImportOutcome = {
      ...emptyImportOutcome(),
      beneficiaryDetails: [],
      unmatchedBeneficiaries: [],
    }

    const patientRepo = new PatientPgRepository(this.pool)
    const allPatientsRaw = await patientRepo.findAll()
    const allPatients: MatchablePatient[] = allPatientsRaw.map((p) => ({
      id: p.id,
      name: p.name,
      cpf: p.cpf,
      cns: p.cns,
      birthDate: p.birthDate,
      parentIds: p.parentIds,
    }))
    const household = buildHouseholdCandidates(linkPatientId, allPatients)

    const beneficiaryRecords = batch.records.filter((r) => r.type === 'beneficiary')
    const patientByMarca = new Map<string, MatchablePatient>()
    const authCountByMarca = new Map<string, number>()

    for (const record of batch.records) {
      if (record.type === 'authorization' && record.beneficiaryKey) {
        authCountByMarca.set(
          record.beneficiaryKey,
          (authCountByMarca.get(record.beneficiaryKey) ?? 0) + 1,
        )
      }
    }

    for (const record of beneficiaryRecords) {
      if (record.type !== 'beneficiary') continue
      const match = matchAmilBeneficiaryToPatient(
        {
          name: record.name,
          marcaOtica: record.marcaOtica || record.beneficiaryKey || '',
          cpf: record.cpf ?? undefined,
          cns: record.cns ?? undefined,
          birthDate: record.birthDate ?? undefined,
          role: (record.role as 'holder' | 'dependent') || 'dependent',
        },
        linkPatientId,
        household,
        allPatients,
      )

      const marca = record.beneficiaryKey || record.marcaOtica || ''
      const authCount = authCountByMarca.get(marca) ?? 0

      if (!match) {
        outcome.unmatchedBeneficiaries!.push({
          name: record.name,
          marcaOtica: record.marcaOtica || marca,
          cpf: record.cpf ?? undefined,
          cns: record.cns ?? undefined,
          birthDate: record.birthDate ?? undefined,
          role: (record.role as 'holder' | 'dependent') || 'dependent',
          authorizationCount: authCount,
        })
        outcome.skipped += 1 + authCount
        continue
      }

      patientByMarca.set(marca, match)
    }

    for (const [marca, patient] of patientByMarca) {
      const coverage = batch.records.find(
        (r) => r.type === 'coverage' && r.beneficiaryKey === marca,
      )
      if (coverage?.type === 'coverage' && coverage.raw) {
        await this.planService.upsertFromPortal(
          patient.id,
          coverage.raw as unknown as PortalPlanSnapshot,
          integrationLinkId,
        )
      }

      const membership = batch.records.find(
        (r) => r.type === 'coverage_membership' && r.beneficiaryKey === marca,
      )
      if (membership?.type === 'coverage_membership' && membership.memberNumber) {
        if (membership.role === 'holder') {
          outcome.cardNumberHint = membership.memberNumber
        }
      }

      const beneficiaryRecord = beneficiaryRecords.find(
        (r) => r.type === 'beneficiary' && (r.beneficiaryKey === marca || r.marcaOtica === marca),
      )
      const existingAuths = await this.authRepo.findAll({ patientId: patient.id })
      const authRecords = batch.records.filter(
        (r) => r.type === 'authorization' && r.beneficiaryKey === marca,
      )

      let importedForPatient = 0
      let updatedForPatient = 0

      for (const authRecord of authRecords) {
        if (authRecord.type !== 'authorization') continue
        const item = authRecord.raw as AmilAuthorizationItem | undefined
        if (!item) {
          outcome.skipped++
          continue
        }
        const stats = await this.importAmilAuthorization(
          item,
          patient.id,
          batchId,
          existingAuths,
          beneficiaryRecord?.name ?? authRecord.beneficiaryName ?? undefined,
        )
        importedForPatient += stats.imported
        updatedForPatient += stats.updated
        if (!stats.imported && !stats.updated) {
          outcome.skipped++
          outcome.skippedAuthorizations++
        }
        outcome.authorizationDetails.push(...stats.details)
        outcome.imported += stats.imported
        outcome.updated += stats.updated
      }

      outcome.authorizations += importedForPatient
      outcome.updatedAuthorizations += updatedForPatient

      outcome.beneficiaryDetails!.push({
        name: beneficiaryRecord?.name || patient.name,
        marcaOtica: marca,
        role: (beneficiaryRecord?.role as 'holder' | 'dependent') || 'dependent',
        matched: true,
        patientId: patient.id,
        patientName: patient.name,
        authorizationsImported: importedForPatient,
        authorizationsUpdated: updatedForPatient,
      })
    }

    await this.lineage.completeBatch(batchId, {
      connectorId: batch.connectorId,
      jobId: batch.jobId,
      ...outcome,
    })

    return outcome
  }

  private async importAmilAuthorization(
    item: AmilAuthorizationItem,
    patientId: string,
    batchId: string,
    existingAuths: Authorization[],
    beneficiaryName?: string,
  ): Promise<{ imported: number; updated: number; details: SyncAuthorizationDetail[] }> {
    const authBySolicitation = new Map(
      existingAuths
        .filter((a) => a.solicitationNumber)
        .map((a) => [a.solicitationNumber!, a]),
    )

    const solicitationNumber = item.solicitationNumber
    const existing = authBySolicitation.get(solicitationNumber)
    const props = {
      patientId,
      procedureDescription: item.procedureDescription || item.classification || undefined,
      doctorName: item.doctorName || undefined,
      clinicName: item.clinicName || undefined,
      authorizationDate:
        parseDate(item.authorizationDate) ?? parseFlexibleDate(item.authorizationDate) ?? undefined,
      validityDate:
        parseDate(item.validityDate) ?? parseFlexibleDate(item.validityDate) ?? undefined,
      status: item.status || 'authorized',
      guideNumber: item.guideNumber || solicitationNumber,
      source: 'amil',
      solicitationNumber,
      guidePassword: item.guidePassword || undefined,
      notes: item.token ? `Token: ${item.token}` : undefined,
      authorizationType: item.authorizationType || undefined,
      classification: item.classification || undefined,
    }

    let action: 'created' | 'updated'
    let imported = 0
    let updated = 0
    let saved: Authorization

    if (existing) {
      const unchanged =
        (existing.procedureDescription || '') === (props.procedureDescription || '')
        && (existing.doctorName || '') === (props.doctorName || '')
        && (existing.status || '') === (props.status || '')
        && (existing.guidePassword || '') === (props.guidePassword || '')
        && (existing.notes || '') === (props.notes || '')
      if (unchanged) {
        return { imported: 0, updated: 0, details: [] }
      }
      saved = await this.authRepo.update(
        Authorization.restore({
          ...existing.toJSON(),
          ...Authorization.create(props, existing.id).toJSON(),
          id: existing.id,
          createdAt: existing.createdAt,
          items: existing.items,
        }),
      )
      updated = 1
      action = 'updated'
    } else {
      saved = await this.authRepo.save(Authorization.create(props))
      imported = 1
      action = 'created'
      authBySolicitation.set(solicitationNumber, saved)
      existingAuths.push(saved)
    }

    await this.lineage.recordRaw({
      batchId,
      patientId,
      source: 'amil',
      recordType: 'authorization',
      externalKey: solicitationNumber,
      rawJson: item as unknown as Record<string, unknown>,
      processed: { table: 'authorizations', id: saved.id },
    })

    return {
      imported,
      updated,
      details: [{
        solicitationNumber,
        classification: item.classification || item.procedureDescription || undefined,
        doctorName: item.doctorName || undefined,
        itemCount: 0,
        action,
        beneficiaryName,
      }],
    }
  }
}
