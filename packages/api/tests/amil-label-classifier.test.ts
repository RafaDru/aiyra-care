import { describe, it, expect } from 'vitest'
import { AmilLabelClassifier } from '../src/application/classification/amil-label-classifier.js'
import { FuzzyExamCatalogLookup } from '../src/infrastructure/classification/fuzzy-exam-catalog-lookup.js'
import {
  amilResultToCanonicalBatch,
} from '../src/application/connect/mappers/amil-canonical.mapper.js'
import type { AmilSyncResult } from '../src/infrastructure/scraper/amil-sync.scraper.js'

const engine = new AmilLabelClassifier({ lookup: new FuzzyExamCatalogLookup() })

describe('AmilLabelClassifier', () => {
  it('classifica consulta -> medical_record', () => {
    const c = engine.classifySync('CONSULTA EM PRONTO SOCORRO')
    expect(c.destination).toBe('medical_record')
    expect(c.kind).toBe('consulta')
  })

  it('classifica exame por catálogo exato -> exam', () => {
    const c = engine.classifySync('HEMOGRAMA')
    expect(c.destination).toBe('exam')
    expect(c.catalogId).toBe('HEMOGRAMA')
  })

  it('classifica por sinônimo (glicemia = glicose) -> exam', () => {
    const c = engine.classifySync('GLICEMIA DE JEJUM')
    expect(c.destination).toBe('exam')
    expect(c.catalogId).toBe('GLICOSE')
  })

  it('reconhece sigla HBA1C -> exam', () => {
    const c = engine.classifySync('HEMOGLOBINA GLICADA HBA1C')
    expect(c.destination).toBe('exam')
    expect(c.catalogId).toBe('HEMOGLOBINA_GLICADA')
  })

  it('classifica keyword exame -> exam', () => {
    const c = engine.classifySync('EXAME DE SANGUE')
    expect(c.destination).toBe('exam')
  })

  it('fuzzy aproxima hemo variação -> exam', () => {
    const c = engine.classifySync('HEMOGRAMA COMPLETO COM PLAQUETAS')
    expect(c.destination).toBe('exam')
    expect(c.catalogId).toBe('HEMOGRAMA')
  })

  it('fallback padrão -> outro/medical_record', () => {
    const c = engine.classifySync('PLANO ODONTOLOGICO DOCUMENTO')
    expect(c.destination).toBe('medical_record')
  })

  it('histórico e assíncrono via port', async () => {
    const c = await engine.classify('CONSULTA PEDIATRICA')
    expect(c.kind).toBe('consulta')
  })
})

describe('amilResultToCanonicalBatch routing', () => {
  function batch() {
    const base: AmilSyncResult = {
      beneficiaryData: [
        {
          beneficiary: {
            marcaOtica: 'M1', name: 'Rafael', cpf: '000', cns: '0', role: 'holder',
            // @ts-expect-error shape
          },
          plan: { externalKey: 'P1', planName: 'Amil', operatorName: 'Amil', productCode: 'P', networkName: 'N' },
          marcas: [],
          authorizations: [],
          usageItems: [
            { procedureDate: '10/02/2025', procedureDescription: 'HEMOGRAMA', doctorName: 'Dr A', providerName: 'LabX', invoiceNumber: 'INV1', kind: 'exame' },
            { procedureDate: '11/02/2025', procedureDescription: 'CONSULTA EM PRONTO SOCORRO', doctorName: 'Dr B', providerName: 'PS', invoiceNumber: 'INV2', kind: 'consulta' },
          ],
        },
      ],
    } as unknown as AmilSyncResult

    return amilResultToCanonicalBatch(base, {
      connectionId: 'c', jobId: 'j', classifier: engine,
    })
  }

  it('roteia exame -> exam e consulta -> medical_record', () => {
    const b = batch()
    const exam = b.records.find((r) => r.type === 'exam')
    const record = b.records.find((r) => r.type === 'medical_record')
    expect(exam?.type).toBe('exam')
    expect((exam as { name?: string }).name).toBe('Hemograma')
    expect(record?.type).toBe('medical_record')
    expect((record as { description?: string }).description).toBe('CONSULTA EM PRONTO SOCORRO')
    expect(b.stats.exams).toBe(1)
    expect(b.stats.medicalRecords).toBe(1)
  })
})
