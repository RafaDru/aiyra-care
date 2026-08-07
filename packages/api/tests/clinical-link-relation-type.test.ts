import { describe, expect, it } from 'vitest'
import { RelationType } from '../src/domain/clinical-link/relation-type.entity.js'

describe('RelationType', () => {
  const orderedExam = RelationType.restore({
    code: 'ORDERED_EXAM',
    label: 'Solicitou exame',
    fromEntityType: 'medical_record',
    toEntityType: 'exam',
    neo4jRelType: 'ORDERED',
    description: null,
    inverseLabel: null,
  })

  it('matches consulta → exame', () => {
    expect(orderedExam.matches('medical_record', 'exam')).toBe(true)
    expect(orderedExam.matches('medical_record', 'authorization')).toBe(false)
  })

  it('RELATED matches any clinical pair', () => {
    const related = RelationType.restore({
      code: 'RELATED',
      label: 'Relacionado',
      fromEntityType: 'clinical_entity',
      toEntityType: 'clinical_entity',
      neo4jRelType: 'RELATED',
      description: null,
      inverseLabel: null,
    })
    expect(related.matches('exam', 'authorization')).toBe(true)
  })
})
