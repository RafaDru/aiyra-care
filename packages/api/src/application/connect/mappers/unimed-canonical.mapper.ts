import { randomUUID } from 'node:crypto'
import type { CanonicalSyncBatch, CanonicalRecord } from '@open-health/connect'
import type { UnimedBhSyncResult } from '../../../infrastructure/scraper/unimedbh-sync.scraper.js'
import type { UnimedBhUsageItem } from '../../../infrastructure/scraper/unimedbh-extrato.scraper.js'
import type { UnimedBhAuthorizationItem } from '../../../infrastructure/scraper/unimedbh-autorizacoes.scraper.js'
import type { PatientMatcher } from '../../domain/patient/patient-matcher.js'

export async function unimedResultToCanonicalBatch(
  result: UnimedBhSyncResult,
  ctx: {
    connectionId: string
    jobId: string
    tenantRef?: string | null
    patientMatcher?: PatientMatcher
    possiblePatientIds?: string[] // IDs de pacientes da conexão
  },
): Promise<CanonicalSyncBatch> {
  const records: CanonicalRecord[] = []
  const possibleIds = ctx.possiblePatientIds ?? []
  const allItems: UnimedBhUsageItem[] = [...result.extrato.paciente]
  for (const depItems of Object.values(result.extrato.dependentes)) {
    allItems.push(...depItems)
  }

  for (const item of allItems) {
    const patientId = (possibleIds.length && ctx.patientMatcher)
      ? (await ctx.patientMatcher.findMatchingPatientId(
          item.patientName,
          possibleIds,
        )) ?? ctx.connectionId
      : ctx.connectionId

    if (item.kind === 'consulta' || (item.kind === 'outro' && item.doctorName)) {
      records.push({
        type: 'medical_record',
        externalKey: item.invoiceNumber
          ? `inv:${item.invoiceNumber}`
          : item.providerExternalId
            ? `prov:${item.providerExternalId}|${item.procedureDate}|${item.procedureDescription || ''}`
            : `${item.procedureDate}|${item.doctorName || ''}|${item.procedureDescription || ''}`,
        beneficiaryName: item.patientName,
        beneficiaryKey: item.cardNumber,
        patientId,
        recordType: item.kind === 'consulta' ? 'consulta' : 'outro',
        date: item.procedureDate,
        providerName: 'Unimed BH',
        description: item.procedureDescription || undefined,
        raw: item as unknown as Record<string, unknown>,
      })
    }
    if (item.kind === 'exame' && item.procedureDescription) {
      records.push({
        type: 'exam',
        externalKey: `${item.procedureDescription}|${item.procedureDate}`,
        beneficiaryName: item.patientName,
        beneficiaryKey: item.cardNumber,
        patientId,
        name: item.procedureDescription,
        performedAt: item.procedureDate,
        laboratory: item.doctorName || undefined,
        raw: item as unknown as Record<string, unknown>,
      })
    }
  }

  const allAuths: UnimedBhAuthorizationItem[] = [...result.autorizacoes.paciente]
  for (const depItems of Object.values(result.autorizacoes.dependentes)) {
    allAuths.push(...depItems)
  }

  for (const item of allAuths) {
    const patientId = (possibleIds.length && ctx.patientMatcher)
      ? (await ctx.patientMatcher.findMatchingPatientId(
          item.patientName,
          possibleIds,
        )) ?? ctx.connectionId
      : ctx.connectionId
    const solicitationNumber = item.solicitationNumber || item.guideNumber || ''
    records.push({
      type: 'authorization',
      externalKey: solicitationNumber || `${item.procedureCode || ''}|${item.guideNumber || ''}`,
      beneficiaryName: item.patientName,
      patientId,
      solicitationNumber: solicitationNumber || undefined,
      status: item.status || undefined,
      classification: item.classification || item.procedureDescription || undefined,
      doctorName: item.doctorName || undefined,
      requestedAt: item.authorizationDate || undefined,
      validUntil: item.validityDate || undefined,
      items: (item.items ?? []).map((proc, idx) => ({
        type: 'authorization_item' as const,
        externalKey: `${solicitationNumber}|${proc.procedureCode || idx}`,
        parentExternalKey: solicitationNumber || undefined,
        procedureCode: proc.procedureCode || undefined,
        procedureName: proc.procedureDescription,
        quantity: proc.quantityAuthorized ?? proc.quantityRequested ?? undefined,
        raw: proc as unknown as Record<string, unknown>,
      })),
      raw: item as unknown as Record<string, unknown>,
    })
  }

  if (result.planCard) {
    const patientId = (possibleIds.length && ctx.patientMatcher)
      ? (await ctx.patientMatcher.findMatchingPatientId(
          result.planCard.patientName,
          possibleIds,
        )) ?? ctx.connectionId
      : ctx.connectionId
    records.push({
      type: 'coverage',
      externalKey: result.planCard.externalKey,
      patientId,
      planName: result.planCard.planName,
      operatorName: result.planCard.operatorName,
      productCode: result.planCard.productCode,
      networkName: result.planCard.networkName,
      segmentation: result.planCard.segmentation,
      raw: result.planCard as unknown as Record<string, unknown>,
    })
    if (result.planCard.cardNumber) {
      records.push({
        type: 'coverage_membership',
        externalKey: result.planCard.cardNumber,
        patientId,
        memberNumber: result.planCard.cardNumber,
        role: 'holder',
        status: 'active',
        cns: result.planCard.cns || undefined,
        cardValidFrom: result.planCard.cardValidFrom || undefined,
        cardValidTo: result.planCard.cardValidTo || undefined,
        raw: result.planCard as unknown as Record<string, unknown>,
      })
    }
  }

  return {
    batchId: randomUUID(),
    connectionId: ctx.connectionId,
    connectorId: 'unimed_bh',
    jobId: ctx.jobId,
    tenantRef: ctx.tenantRef,
    startedAt: new Date().toISOString(),
    status: 'completed',
    records,
    stats: {
      medical_records: records.filter((r) => r.type === 'medical_record').length,
      exams: records.filter((r) => r.type === 'exam').length,
      authorizations: records.filter((r) => r.type === 'authorization').length,
      coverage: records.filter((r) => r.type === 'coverage').length,
    },
  }
}
