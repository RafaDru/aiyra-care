import { describe, it, expect } from 'vitest'
import { caregiverFirstName } from '../src/domain/llm/ava-personalization.js'
import { buildAvaSystemPrompt } from '../src/application/llm/ava-orchestrator.service.js'

describe('ava-personalization', () => {
  it('extracts first name from display name', () => {
    expect(caregiverFirstName('Rafael Silva', null)).toBe('Rafael')
  })

  it('falls back to email local part', () => {
    expect(caregiverFirstName(null, 'rafael@example.com')).toBe('rafael')
  })
})

describe('buildAvaSystemPrompt', () => {
  it('includes caregiver first name when provided', () => {
    const prompt = buildAvaSystemPrompt('pediatra', 'Rafael')
    expect(prompt).toContain('Rafael')
  })
})
