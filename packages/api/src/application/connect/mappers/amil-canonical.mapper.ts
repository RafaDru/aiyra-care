import { randomUUID } from 'node:crypto'
import type { CanonicalSyncBatch, CanonicalRecord } from '@open-health/connect'
import type { AmilSyncResult } from '../../../infrastructure/scraper/amil-sync.scraper.js'
import { AmilLabelClassifier } from '../../classification/amil-label-classifier.js'
import { FuzzyExamCatalogLookup } from '../../../infrastructure/classification/fuzzy-exam-catalog-lookup.js'
import type { LabelClassifierEngine } from '../../../domain/classification/label-classification.js'

/** Motor default: regras + fuzzy local (sem LLM). Trocável via ctx.classifier. */
const defaultClassifier: LabelClassifierEngine = new AmilLabelClassifier({
  lookup: new FuzzyExamCatalogLookup(),
})

export function amilResultToCanonicalBatch(
  result: AmilSyncResult,
  ctx: {
    connectionId: string
    jobId: string
    tenantRef?: string | null
    /** Sync silencioso — não emite coverage (evita upsert com plano stub). */
    skipCoverage?: boolean
    /** Motor de classificação de rótulos (ox. injetável; default = AmilLabelClassifier). */
    classifier?: LabelClassifierEngine
  },
): CanonicalSyncBatch {
  const classifier: LabelClassifierEngine = ctx.classifier ?? defaultClassifier
  const records: CanonicalRecord[] = []

  for (const entry of result.beneficiaryData) {
    const key = entry.beneficiary.marcaOtica || entry.marcaOtica
    const beneficiaryName = entry.beneficiary.name

    records.push({
      type: 'beneficiary',
      externalKey: key,
      beneficiaryKey: key,
      name: beneficiaryName,
      marcaOtica: entry.beneficiary.marcaOtica,
      cpf: entry.beneficiary.cpf,
      cns: entry.beneficiary.cns,
      birthDate: entry.beneficiary.birthDate,
      role: entry.beneficiary.role,
      raw: entry.beneficiary as unknown as Record<string, unknown>,
    })

    if (!ctx.skipCoverage) {
      records.push({
        type: 'coverage',
        externalKey: entry.plan.externalKey,
        beneficiaryKey: key,
        beneficiaryName,
        planName: entry.plan.planName,
        operatorName: entry.plan.operatorName,
        productCode: entry.plan.productCode,
        networkName: entry.plan.networkName,
        raw: entry.plan as unknown as Record<string, unknown>,
      })

      if (entry.cardNumber) {
        records.push({
          type: 'coverage_membership',
          externalKey: `${key}|${entry.cardNumber}`,
          beneficiaryKey: key,
          beneficiaryName,
          memberNumber: entry.cardNumber,
          role: entry.beneficiary.role,
          status: 'active',
          raw: { cardNumber: entry.cardNumber, marcaOtica: entry.marcaOtica } as Record<string, unknown>,
        })
      }
    }

    for (const item of entry.authorizations) {
      records.push({
        type: 'authorization',
        externalKey: item.solicitationNumber,
        beneficiaryKey: key,
        beneficiaryName,
        solicitationNumber: item.solicitationNumber,
        status: item.status || undefined,
        classification: item.classification || item.procedureDescription || undefined,
        doctorName: item.doctorName || undefined,
        requestedAt: item.authorizationDate || undefined,
        validUntil: item.validityDate || undefined,
        raw: item as unknown as Record<string, unknown>,
      })
    }

    for (const usage of entry.usageItems ?? []) {
      const procDesc = usage.procedureDescription || usage.kind || ''
      const classification = classifier.classifySync
        ? classifier.classifySync(procDesc)
        : null

      const dest: 'exam' | 'medical_record' =
        classification && classification.destination === 'exam' ? 'exam' : 'medical_record'

      const externalKey = usage.invoiceNumber
        ? `inv:${usage.invoiceNumber}`
        : `${usage.procedureDate}|${procDesc}|${usage.doctorName}`

      if (dest === 'exam') {
        records.push({
          type: 'exam',
          externalKey,
          beneficiaryKey: key,
          beneficiaryName,
          name: classification?.canonicalName || procDesc,
          performedAt: usage.procedureDate,
          laboratory: usage.providerName || 'Amil',
          raw: { ...(usage as unknown as Record<string, unknown>), __amilClassified: classification },
        })
      } else {
        records.push({
          type: 'medical_record',
          externalKey,
          beneficiaryKey: key,
          beneficiaryName,
          recordType: usage.kind,
          date: usage.procedureDate,
          providerName: usage.providerName || 'Amil',
          description: procDesc,
          raw: { ...(usage as unknown as Record<string, unknown>), __amilClassified: classification },
        })
      }
    }
  }

  const authCount = records.filter((r) => r.type === 'authorization').length
  const medicalCount = records.filter((r) => r.type === 'medical_record').length
  const examCount = records.filter((r) => r.type === 'exam').length
  const usageCount = medicalCount + examCount

  return {
    batchId: randomUUID(),
    connectionId: ctx.connectionId,
    connectorId: 'amil_beneficiario',
    jobId: ctx.jobId,
    tenantRef: ctx.tenantRef,
    startedAt: new Date().toISOString(),
    status: 'completed',
    records,
    stats: {
      beneficiaries: result.beneficiaryData.length,
      authorizations: authCount,
      medicalRecords: medicalCount,
      exams: examCount,
      coverage: records.filter((r) => r.type === 'coverage').length,
    },
  }
}
