import { describe, it, expect } from 'vitest'
import {
  validateAvaReplyDeterministic,
  parseAvaCritiqueJson,
  mergeTokenUsages,
  combineReflectionOutcome,
  shouldSkipLlmCritique,
  reflectionNeedsFullContext,
} from '../src/domain/llm/ava-reflection.js'
import type { FamilySupportInsight } from '../src/domain/family-support/family-support.types.js'

describe('ava-reflection', () => {
  it('flags affirmative diagnosis', () => {
    const r = validateAvaReplyDeterministic(
      'Com base no que você descreveu, é pneumonia e precisa de antibiótico.',
      [],
      'febre e tosse',
    )
    expect(r.issues.some((i) => i.includes('diagnóstico'))).toBe(true)
    expect(r.severity).toBe('critical')
  })

  it('flags contradiction with do_not_apply insight', () => {
    const insights: FamilySupportInsight[] = [{
      id: 'x',
      kind: 'medication_safety',
      action: 'do_not_apply',
      priority: 'critical',
      title: 'Alergia',
      message: 'Não aplicar dipirona',
      citations: [],
      audience: 'family',
    }]
    const r = validateAvaReplyDeterministic(
      'Pode aplicar dipirona agora para a febre.',
      insights,
      'febre',
    )
    expect(r.issues.length).toBeGreaterThan(0)
  })

  it('parses critique JSON', () => {
    const parsed = parseAvaCritiqueJson('{"satisfactory":false,"issues":["muito longa"],"severity":"minor"}')
    expect(parsed?.satisfactory).toBe(false)
    expect(parsed?.severity).toBe('minor')
  })

  it('merges token usages', () => {
    const merged = mergeTokenUsages([
      { tokensIn: 100, tokensOut: 50, tokensTotal: 150, usageSource: 'api' },
      { tokensIn: 200, tokensOut: 80, tokensTotal: 280, usageSource: 'estimated' },
    ])
    expect(merged.tokensTotal).toBe(430)
    expect(merged.usageSource).toBe('estimated')
  })

  it('combines reflection outcome', () => {
    const outcome = combineReflectionOutcome(
      { issues: [], severity: 'ok' },
      { satisfactory: true, issues: [], severity: 'ok' },
      false,
      2,
      ['draft', 'critique'],
    )
    expect(outcome.satisfactory).toBe(true)
    expect(outcome.attempts).toBe(2)
  })

  it('skips LLM critique when deterministic ok and reply not too long', () => {
    const ok = { issues: [] as string[], severity: 'ok' as const }
    expect(shouldSkipLlmCritique(ok, 'Resposta curta e adequada.', 'últimas vacinas?')).toBe(true)
    expect(shouldSkipLlmCritique(ok, 'x'.repeat(3000), 'últimas vacinas?')).toBe(false)
  })

  it('reflectionNeedsFullContext when unsatisfactory or revised', () => {
    const ok = combineReflectionOutcome(
      { issues: [], severity: 'ok' },
      { satisfactory: true, issues: [], severity: 'ok' },
      false,
      1,
      [],
    )
    expect(reflectionNeedsFullContext(ok)).toBe(false)

    const bad = combineReflectionOutcome(
      { issues: ['faltou contexto do prontuário'], severity: 'minor' },
      null,
      false,
      1,
      [],
    )
    expect(reflectionNeedsFullContext(bad)).toBe(true)
  })
})
