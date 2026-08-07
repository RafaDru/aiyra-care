import { randomUUID } from 'node:crypto'
import type { CanonicalSyncBatch, CanonicalRecord } from '@open-health/connect'
import type { AmilSyncResult } from '../../../infrastructure/scraper/amil-sync.scraper.js'

export function amilResultToCanonicalBatch(
  result: AmilSyncResult,
  ctx: {
    connectionId: string
    jobId: string
    tenantRef?: string | null
  },
): CanonicalSyncBatch {
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
  }

  const authCount = records.filter((r) => r.type === 'authorization').length

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
      coverage: records.filter((r) => r.type === 'coverage').length,
    },
  }
}
