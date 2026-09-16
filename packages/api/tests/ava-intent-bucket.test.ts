import { describe, expect, it } from 'vitest'
import { classifyAvaIntentBucket, normalizeAvaErrorCode } from '../src/domain/llm/ava-intent-bucket.js'

describe('classifyAvaIntentBucket', () => {
  it('classifies coarse intents without storing message text', () => {
    expect(classifyAvaIntentBucket('como está o hemograma?')).toBe('exam')
    expect(classifyAvaIntentBucket('carteira de vacinas')).toBe('vaccine')
    expect(classifyAvaIntentBucket('sincronizar unimed')).toBe('sync_integration')
    expect(classifyAvaIntentBucket('unificar exames duplicados')).toBe('hygiene')
    expect(classifyAvaIntentBucket('chamar samu agora')).toBe('emergency')
    expect(classifyAvaIntentBucket('oi')).toBe('general')
  })
})

describe('normalizeAvaErrorCode', () => {
  it('maps known failures to stable codes', () => {
    expect(normalizeAvaErrorCode('Franquia de IA esgotada')).toBe('LLM_QUOTA_EXCEEDED')
    expect(normalizeAvaErrorCode('Network request failed')).toBe('NETWORK_ERROR')
    expect(normalizeAvaErrorCode('AVA_LLM_DISABLED')).toBe('AVA_LLM_DISABLED')
  })
})
